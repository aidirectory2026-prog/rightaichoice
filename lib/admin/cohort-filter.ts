// Phase 14 Wave 3 — cohort-as-filter.
//
// When a page URL carries ?cohort=<id>, resolve that saved cohort
// (admin_saved_views, kind='cohort') to its distinct_id set via insights_cohort
// (migration 163) and attach the ids to AdminFilters.distinctIds. The shared SQL
// predicate (migration 181) then constrains EVERY filter-aware query on the page
// to those visitors — so any insights dashboard can be pinned to a saved segment
// ("show me all reports for just high-intent India mobile users"). Absent or
// unresolvable → filters unchanged (no constraint).

import { getAdminClient } from '@/lib/cron/supabase-admin'
import type { AdminFilters } from '@/lib/admin/filters'

// Cohorts at this scale are hundreds of members. The cap matters for TWO
// reasons: (1) jsonb payload size on the RPC path, and (2) the PostgREST
// mirror serializes `.in('distinct_id', ids)` into the request URL — past
// ~300 ids the URL exceeds gateway limits and the request FAILS (which the
// count tiles used to swallow as silent zeros). 300 keeps both paths safe
// and consistent; an over-cap cohort under-constrains (documented).
const COHORT_MEMBER_CAP = 300

type SavedCohortPayload = { match?: 'and' | 'or'; days?: number; conditions?: unknown[] }

/** Resolve ?cohort=<id> → AdminFilters with distinctIds populated. */
export async function withCohort(
  filters: AdminFilters,
  sp: Record<string, string | undefined>,
): Promise<AdminFilters> {
  const id = sp.cohort
  if (!id) return filters

  const db = getAdminClient()
  const { data: view } = await db
    .from('admin_saved_views')
    .select('payload')
    .eq('id', id)
    .eq('kind', 'cohort')
    .maybeSingle()

  const payload = (view as { payload?: SavedCohortPayload } | null)?.payload
  if (!payload?.conditions || payload.conditions.length === 0) return filters

  const days = Math.min(Math.max(Number(payload.days ?? 30), 1), 365)
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).rpc('insights_cohort', {
    p_conditions: { op: payload.match ?? 'and', conditions: payload.conditions },
    p_cutoff: cutoff,
    p_end: null,
    p_include_bots: false,
    p_limit: COHORT_MEMBER_CAP,
  })
  if (error) return filters // resolution failed → don't silently show a wrong subset
  const ids = ((data ?? []) as { distinct_id: string }[]).map((r) => r.distinct_id).filter(Boolean)
  // A resolved-but-EMPTY cohort must still constrain the view. An empty array
  // is dropped by filtersToJsonb/applyFilters (indistinguishable from "no
  // cohort"), which used to silently show ALL data — so pin a sentinel id
  // that matches nothing instead.
  return { ...filters, distinctIds: ids.length ? ids : ['__no_cohort_match__'] }
}
