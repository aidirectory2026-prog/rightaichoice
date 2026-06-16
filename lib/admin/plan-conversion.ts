/**
 * Phase 9 — Query helpers for /admin/plan-conversion.
 *
 * All queries are time-windowed via the shared parseRange() from
 * lib/admin/range.ts (so Today / Yesterday / 7d / 30d / custom all work
 * with the same code path).
 *
 * Phase 10.5b.3 — converted to the single AdminFilters argument (the
 * established 4B/5a pattern). user_events-based legs (funnel, surface
 * breakdown) honor the bots toggle AND every optional smart filter via the
 * applyFilters() mirror; with the default humans-only/no-optional-filters
 * state they are byte-identical to the F6 behavior (snapshot-oracle
 * verified). plan_intents-based legs (intent stream, link rate) keep their
 * semantics: that table has no bot flag and no filter dimensions, so ONLY
 * the date range applies there (stated on the page).
 */

import { getAdminClient } from '@/lib/cron/supabase-admin'
import { applyFilters, filtersToJsonb, type AdminFilters } from './filters'

export type FunnelStep = {
  step: string
  label: string
  count: number
}

export type SurfaceStat = {
  surface: string
  impressions: number
  clicks: number
  ctr: number
  signups: number
  signup_rate: number
}

export type IntentRow = {
  id: string
  distinct_id: string
  user_id: string | null
  typed_goal: string
  char_count: number
  source_surface: string
  source_path: string | null
  signup_outcome: string | null
  created_at: string
  country: string | null
}

export type LinkRateStat = {
  total_anon_intents: number
  linked_to_user: number
  link_rate_pct: number
}

// Audit (2026-06-16): the old steps 4a/4b/5 tracked plan_signup_modal_oauth_clicked
// / _skipped / _completed — events the signup-flow refactor killed on ~2026-05-28
// (skipped NEVER fired; the others stopped). The funnel therefore showed ~0
// signups while signups were actually happening. Re-pointed at the LIVE events:
// signup_method_selected (method chosen) + signup_completed (the real conversion).
// No branches now — every step is on the main path.
export const EVENT_FUNNEL: ReadonlyArray<{ event: string; label: string; branch?: boolean }> = [
  { event: 'plan_cta_impression',     label: '1. CTA shown' },
  { event: 'plan_cta_clicked',        label: '2. CTA clicked' },
  { event: 'plan_signup_modal_shown', label: '3. Signup gate shown' },
  { event: 'signup_method_selected',  label: '4. Signup method chosen' },
  { event: 'signup_completed',        label: '5. Signup completed' },
  { event: 'plan_started',            label: '6. /plan loaded' },
  { event: 'plan_completed',          label: '7. Plan finalized' },
]

/** Fetches the full funnel for the filters using direct event counts.
 *  Humans-only by default (Phase 10.2 F6); the bots toggle and optional
 *  smart filters apply via the shared mirror. */
export async function getPlanFunnel(f: AdminFilters): Promise<FunnelStep[]> {
  const db = getAdminClient()
  const results = await Promise.all(
    EVENT_FUNNEL.map(async ({ event, label }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
        .eq('event_name', event)
        .gte('created_at', f.range.cutoffISO)
        .lt('created_at', f.range.endCutoffISO)
      if (!f.includeBots) q = q.eq('bot_likely', false)
      q = applyFilters(q, f, { dropEvent: true }) // each step is event-pinned
      const { count } = await q
      return { step: event, label, count: count ?? 0 }
    }),
  )
  return results
}

// ── Unique-visitor sequential funnels (Phase 10 — traffic analysis upgrade) ──
// The event-count funnel above reads "absurd": steps count raw events, so they
// don't decrease monotonically (a modal can be "shown" more than a CTA is
// "clicked"). insights_funnel_users (migration 162) instead counts the distinct
// PEOPLE who completed the longest contiguous prefix up to each step — so the
// numbers always shrink and read like a real drop-off.

export type FunnelUserStep = {
  step: string
  label: string
  users: number
  pct_of_first: number // % of step-1 users still present
  dropped_from_prev: number // users lost since the previous step
  drop_pct: number // % lost vs the previous step
}

// Two clean, separate journeys (no more 7-step CTA+signup+plan mash-up):
export const ACQUISITION_STEPS: ReadonlyArray<{ event: string; label: string }> = [
  { event: 'plan_cta_impression', label: 'Saw the CTA' },
  { event: 'plan_cta_clicked', label: 'Clicked the CTA' },
  { event: 'plan_signup_modal_shown', label: 'Reached signup gate' },
  { event: 'signup_completed', label: 'Signed up' },
]
export const COMPLETION_STEPS: ReadonlyArray<{ event: string; label: string }> = [
  { event: 'plan_started', label: 'Started the plan' },
  { event: 'plan_intake_submitted', label: 'Submitted intake' },
  { event: 'plan_completed', label: 'Plan generated' },
  { event: 'plan_results_tool_clicked', label: 'Clicked a result' },
]

export async function getFunnelUsers(
  steps: ReadonlyArray<{ event: string; label: string }>,
  f: AdminFilters,
): Promise<FunnelUserStep[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any).rpc('insights_funnel_users', {
    p_steps: steps.map((s) => s.event),
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    p_include_bots: f.includeBots,
    p_filters: filtersToJsonb(f),
  })
  const rows = (data ?? []) as Array<{ step_index: number; event_name: string; users: number }>
  const byIndex = new Map(rows.map((r) => [Number(r.step_index), Number(r.users)]))
  const first = byIndex.get(1) ?? 0
  return steps.map((s, i) => {
    const users = byIndex.get(i + 1) ?? 0
    const prev = i === 0 ? users : (byIndex.get(i) ?? 0)
    const dropped = Math.max(0, prev - users)
    return {
      step: s.event,
      label: s.label,
      users,
      pct_of_first: first > 0 ? Math.round((users / first) * 1000) / 10 : 0,
      dropped_from_prev: i === 0 ? 0 : dropped,
      drop_pct: i === 0 || prev === 0 ? 0 : Math.round((dropped / prev) * 1000) / 10,
    }
  })
}

/** Per-surface impressions vs clicks vs signups (computed from event props). */
export async function getSurfaceBreakdown(f: AdminFilters): Promise<SurfaceStat[]> {
  const db = getAdminClient()
  const surfaces = ['sticky_bar', 'inline_card', 'navbar', 'homepage', 'plan_page'] as const
  // Every leg is pinned to one event name + one surface prop; bots toggle +
  // optional smart filters apply via the shared mirror (humans-only default
  // preserves the F6 baseline byte-for-byte).
  const countLeg = (event: string, propKey: string, surface?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
      .eq('event_name', event)
      .gte('created_at', f.range.cutoffISO)
      .lt('created_at', f.range.endCutoffISO)
    if (!f.includeBots) q = q.eq('bot_likely', false)
    if (surface) q = q.eq(`properties->>${propKey}`, surface)
    return applyFilters(q, f, { dropEvent: true })
  }
  const out: SurfaceStat[] = []
  for (const surface of surfaces) {
    const [impr, click, sig] = await Promise.all([
      countLeg('plan_cta_impression', 'surface', surface),
      countLeg('plan_cta_clicked', 'surface', surface),
      countLeg('plan_signup_modal_completed', 'source_surface', surface),
    ])
    const impressions = impr.count ?? 0
    const clicks = click.count ?? 0
    const signups = sig.count ?? 0
    out.push({
      surface,
      impressions,
      clicks,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : 0,
      signups,
      signup_rate: clicks > 0 ? Math.round((signups / clicks) * 1000) / 10 : 0,
    })
  }

  // Fable-5 review (Dept A) — built-in parity check. This row is computed
  // WITHOUT the properties->>surface filter; if the per-surface rows above
  // don't (roughly) sum to it, the JSONB filter is silently failing or events
  // are firing without a surface prop — either way the discrepancy is now
  // visible on the dashboard instead of masquerading as "zero conversions".
  const [allImpr, allClick, allSig] = await Promise.all([
    countLeg('plan_cta_impression', 'surface'),
    countLeg('plan_cta_clicked', 'surface'),
    countLeg('plan_signup_modal_completed', 'source_surface'),
  ])
  const totImpr = allImpr.count ?? 0
  const totClick = allClick.count ?? 0
  const totSig = allSig.count ?? 0
  out.push({
    surface: 'ALL (parity check)',
    impressions: totImpr,
    clicks: totClick,
    ctr: totImpr > 0 ? Math.round((totClick / totImpr) * 1000) / 10 : 0,
    signups: totSig,
    signup_rate: totClick > 0 ? Math.round((totSig / totClick) * 1000) / 10 : 0,
  })
  return out
}

/** Last N typed-goal rows from plan_intents (live stream).
 *  plan_intents has NO bot flag / filter dimensions — only the date range
 *  from the filters applies here (semantics unchanged from Phase 9). */
export async function getIntentStream(f: AdminFilters, limit = 50): Promise<IntentRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db.from('plan_intents').select('id, distinct_id, user_id, typed_goal, char_count, source_surface, source_path, signup_outcome, created_at, country') as any)
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) // deterministic within equal timestamps
    .limit(limit)
  return (data ?? []) as IntentRow[]
}

/** Anon-row → known-user link rate over the window. Range-only (see
 *  getIntentStream note — plan_intents carries no filter dimensions). */
export async function getLinkRate(f: AdminFilters): Promise<LinkRateStat> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalQ = (db.from('plan_intents').select('*', { count: 'exact', head: true }) as any)
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkedQ = (db.from('plan_intents').select('*', { count: 'exact', head: true }) as any)
    .not('user_id', 'is', null)
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
  const [tot, linked] = await Promise.all([totalQ, linkedQ])
  const total = tot.count ?? 0
  const linkedCount = linked.count ?? 0
  return {
    total_anon_intents: total,
    linked_to_user: linkedCount,
    link_rate_pct: total > 0 ? Math.round((linkedCount / total) * 1000) / 10 : 0,
  }
}
