/**
 * Phase 9 — Query helpers for /admin/plan-conversion.
 *
 * All queries are time-windowed via the shared parseRange() from
 * lib/admin/range.ts (so Today / Yesterday / 7d / 30d / custom all work
 * with the same code path).
 */

import { getAdminClient } from '@/lib/cron/supabase-admin'
import type { RangeSelection } from './range'

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

const EVENT_FUNNEL: ReadonlyArray<{ event: string; label: string }> = [
  { event: 'plan_cta_impression',          label: '1. CTA shown' },
  { event: 'plan_cta_clicked',             label: '2. CTA clicked' },
  { event: 'plan_signup_modal_shown',      label: '3. Signup modal shown' },
  { event: 'plan_signup_modal_oauth_clicked', label: '4. OAuth clicked' },
  { event: 'plan_signup_modal_skipped',    label: '4. Skipped (still tracked)' },
  { event: 'plan_signup_modal_completed',  label: '5. Signup completed' },
  { event: 'plan_started',                 label: '6. /plan loaded' },
  { event: 'plan_completed',               label: '7. Plan finalized' },
]

/** Fetches the full funnel for the date range using direct event counts. */
export async function getPlanFunnel(sel: RangeSelection): Promise<FunnelStep[]> {
  const db = getAdminClient()
  const results = await Promise.all(
    EVENT_FUNNEL.map(async ({ event, label }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
        .eq('event_name', event)
        .gte('created_at', sel.cutoffISO)
        .lt('created_at', sel.endCutoffISO)
      return { step: event, label, count: count ?? 0 }
    }),
  )
  return results
}

/** Per-surface impressions vs clicks vs signups (computed from event props). */
export async function getSurfaceBreakdown(sel: RangeSelection): Promise<SurfaceStat[]> {
  const db = getAdminClient()
  const surfaces = ['sticky_bar', 'inline_card', 'navbar', 'homepage', 'plan_page'] as const
  const out: SurfaceStat[] = []
  for (const surface of surfaces) {
    const [impr, click, sig] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
        .eq('event_name', 'plan_cta_impression')
        .eq('properties->>surface', surface)
        .gte('created_at', sel.cutoffISO)
        .lt('created_at', sel.endCutoffISO),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
        .eq('event_name', 'plan_cta_clicked')
        .eq('properties->>surface', surface)
        .gte('created_at', sel.cutoffISO)
        .lt('created_at', sel.endCutoffISO),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
        .eq('event_name', 'plan_signup_modal_completed')
        .eq('properties->>source_surface', surface)
        .gte('created_at', sel.cutoffISO)
        .lt('created_at', sel.endCutoffISO),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
      .eq('event_name', 'plan_cta_impression')
      .gte('created_at', sel.cutoffISO)
      .lt('created_at', sel.endCutoffISO),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
      .eq('event_name', 'plan_cta_clicked')
      .gte('created_at', sel.cutoffISO)
      .lt('created_at', sel.endCutoffISO),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.from('user_events').select('*', { count: 'exact', head: true }) as any)
      .eq('event_name', 'plan_signup_modal_completed')
      .gte('created_at', sel.cutoffISO)
      .lt('created_at', sel.endCutoffISO),
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

/** Last N typed-goal rows from plan_intents (live stream). */
export async function getIntentStream(sel: RangeSelection, limit = 50): Promise<IntentRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db.from('plan_intents').select('id, distinct_id, user_id, typed_goal, char_count, source_surface, source_path, signup_outcome, created_at, country') as any)
    .gte('created_at', sel.cutoffISO)
    .lt('created_at', sel.endCutoffISO)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as IntentRow[]
}

/** Anon-row → known-user link rate over the window. */
export async function getLinkRate(sel: RangeSelection): Promise<LinkRateStat> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalQ = (db.from('plan_intents').select('*', { count: 'exact', head: true }) as any)
    .gte('created_at', sel.cutoffISO)
    .lt('created_at', sel.endCutoffISO)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const linkedQ = (db.from('plan_intents').select('*', { count: 'exact', head: true }) as any)
    .not('user_id', 'is', null)
    .gte('created_at', sel.cutoffISO)
    .lt('created_at', sel.endCutoffISO)
  const [tot, linked] = await Promise.all([totalQ, linkedQ])
  const total = tot.count ?? 0
  const linkedCount = linked.count ?? 0
  return {
    total_anon_intents: total,
    linked_to_user: linkedCount,
    link_rate_pct: total > 0 ? Math.round((linkedCount / total) * 1000) / 10 : 0,
  }
}
