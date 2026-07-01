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

// Cohorts at this scale are hundreds of members; cap the resolved set so a
// pathological cohort can't blow up the jsonb payload. If a cohort ever exceeds
// this, it under-constrains (documented) rather than erroring.
const COHORT_MEMBER_CAP = 5000

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
  // A resolved cohort (even empty) constrains the view; empty → the predicate's
  // `distinct_id = ANY('{}')` yields no rows, which is the correct honest result.
  return { ...filters, distinctIds: ids }
}
