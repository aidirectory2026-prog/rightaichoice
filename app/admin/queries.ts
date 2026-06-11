// Phase 10.5a.2 (2026-06-12) — queries for the REAL /admin dashboard
// (replaces the redirect-to-insights placeholder).
//
// Same data discipline as app/admin/insights/queries.ts: every function
// takes the global AdminFilters, RPCs receive p_filters (null fast-path
// when no optional filter is set), direct PostgREST selects use the
// applyFilters() mirror — both paths are the ones the filter-matrix
// verifier proves against raw SQL.
//
// The KPI row adds period-over-period deltas: each metric is computed for
// the selected window AND for the immediately-preceding window of equal
// length (previousRange), by re-running the SAME audited query with
// shifted cutoffs — no new SQL, so the delta inherits the current value's
// provenance.

import { getAdminClient } from '@/lib/cron/supabase-admin'
import { previousRange } from '@/lib/admin/range'
import { applyFilters, filtersToJsonb, type AdminFilters } from '@/lib/admin/filters'
import type { MetricDocKey } from '@/lib/admin/metric-docs'
import type { BarRow } from '@/app/admin/insights/queries'

// Loosely-typed rpc helper (the insights RPCs aren't in generated types).
type RpcArgs = Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rpc(db: ReturnType<typeof getAdminClient>, fn: string, args: RpcArgs): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).rpc(fn, args)
}

export interface KpiWithDelta {
  key: MetricDocKey
  label: string
  current: number
  previous: number
}

/** Distinct visitors via the shared-predicate RPC. */
async function visitorsCount(db: ReturnType<typeof getAdminClient>, f: AdminFilters): Promise<number> {
  const { data } = await rpc(db, 'distinct_visitors_in_window', {
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    p_include_bots: f.includeBots,
    p_filters: filtersToJsonb(f),
  }).maybeSingle()
  return Number((data as { count?: number } | null)?.count ?? 0)
}

/** Distinct signed-in accounts via the shared-predicate RPC. */
async function knownUsersCount(db: ReturnType<typeof getAdminClient>, f: AdminFilters): Promise<number> {
  const { data } = await rpc(db, 'distinct_known_users_in_window', {
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    p_include_bots: f.includeBots,
    p_filters: filtersToJsonb(f),
  }).maybeSingle()
  return Number((data as { count?: number } | null)?.count ?? 0)
}

/** Event-pinned count via the applyFilters() PostgREST mirror — exactly the
 *  getOverviewMetrics pattern (event-pinned tiles drop a global event
 *  filter; the pin already scopes them). */
async function eventCount(
  db: ReturnType<typeof getAdminClient>,
  f: AdminFilters,
  eventName: string,
): Promise<number> {
  let q = db
    .from('user_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', eventName)
    .gte('created_at', f.range.cutoffISO)
    .lt('created_at', f.range.endCutoffISO)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!f.includeBots) q = (q as any).eq('bot_likely', false)
  q = applyFilters(q, f, { dropEvent: true })
  const { count } = await q
  return count ?? 0
}

/**
 * The dashboard KPI row: 6 headline metrics, each computed for the current
 * window and the immediately-preceding window of equal length.
 */
export async function getDashboardKpis(f: AdminFilters): Promise<KpiWithDelta[]> {
  const db = getAdminClient()
  const prev: AdminFilters = { ...f, range: previousRange(f.range) }

  const [
    visitorsNow, visitorsPrev,
    pageViewsNow, pageViewsPrev,
    signedInNow, signedInPrev,
    signupsNow, signupsPrev,
    outclicksNow, outclicksPrev,
    newsletterNow, newsletterPrev,
  ] = await Promise.all([
    visitorsCount(db, f), visitorsCount(db, prev),
    eventCount(db, f, 'page_viewed'), eventCount(db, prev, 'page_viewed'),
    knownUsersCount(db, f), knownUsersCount(db, prev),
    eventCount(db, f, 'signup_completed'), eventCount(db, prev, 'signup_completed'),
    eventCount(db, f, 'tool_visit_redirected'), eventCount(db, prev, 'tool_visit_redirected'),
    eventCount(db, f, 'newsletter_subscribed'), eventCount(db, prev, 'newsletter_subscribed'),
  ])

  return [
    { key: 'kpi_visitors', label: 'Visitors', current: visitorsNow, previous: visitorsPrev },
    { key: 'kpi_page_views', label: 'Page views', current: pageViewsNow, previous: pageViewsPrev },
    { key: 'kpi_signed_in', label: 'Signed-in actives', current: signedInNow, previous: signedInPrev },
    { key: 'kpi_signups', label: 'Signups', current: signupsNow, previous: signupsPrev },
    { key: 'kpi_outclicks', label: 'Outclicks', current: outclicksNow, previous: outclicksPrev },
    { key: 'kpi_newsletter', label: 'Newsletter subs', current: newsletterNow, previous: newsletterPrev },
  ]
}

/** Top pages by page_viewed events — insights_top_property('page_path'),
 *  the same audited RPC family as Top sources. */
export async function getTopPages(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_property', {
    p_property: 'page_path',
    p_days: f.range.days,
    p_limit: 10,
    p_include_bots: f.includeBots,
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    // page_path rows only exist on page_viewed-ish events; a global event
    // filter still composes meaningfully, so it is NOT dropped here.
    p_filters: filtersToJsonb(f),
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}
