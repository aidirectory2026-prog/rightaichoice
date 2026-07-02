// Phase 14b Wave 2 — person pin ("show me everything for THIS user").
//
// ?person=<email | distinct_id | user_id> resolves to that person's
// distinct_id set and feeds the EXISTING cohort mechanism
// (AdminFilters.distinctIds → the shared predicate's distinct_ids key), so
// every filter-aware chart on every page re-scopes to one human with zero
// predicate changes. Resolution order:
//   1. contains '@'  → auth.users email (case-insensitive, exact) → user_id
//                      → every distinct_id that user_id ever produced
//   2. uuid shape    → tried as user_id first, else as a raw distinct_id
//   3. anything else → raw distinct_id, verbatim
//
// An unresolved person yields distinctIds=['__no_person_match__'] — the
// predicate matches nothing, so the page HONESTLY shows zero rows instead of
// silently dropping the filter. personMeta carries the state for the chip.
//
// If a cohort pin is also active, the two sets INTERSECT (person AND cohort).

import { getAdminClient } from '@/lib/cron/supabase-admin'
import type { AdminFilters } from '@/lib/admin/filters'

const PERSON_ID_CAP = 500
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Every distinct_id a user_id has ever produced (login stitches devices). */
async function distinctIdsForUser(userId: string): Promise<string[]> {
  const db = getAdminClient()
  const { data } = await db
    .from('user_events')
    .select('distinct_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5000)
  const ids = [...new Set(((data ?? []) as { distinct_id: string }[]).map((r) => r.distinct_id))]
  return ids.slice(0, PERSON_ID_CAP)
}

export async function withPerson(
  filters: AdminFilters,
  sp: Record<string, string | undefined>,
): Promise<AdminFilters> {
  const raw = (sp.person ?? '').trim().slice(0, 200)
  if (!raw) return filters

  const db = getAdminClient()
  let ids: string[] = []
  let label: string | null = null

  if (raw.includes('@')) {
    // Email → registered-accounts RPC (reads auth.users with service_role —
    // same source of truth as /admin/insights/members).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db as any).rpc('insights_registered_users')
    const match = ((data ?? []) as Array<{ user_id: string; email: string | null }>).find(
      (u) => (u.email ?? '').toLowerCase() === raw.toLowerCase(),
    )
    if (match) {
      ids = await distinctIdsForUser(match.user_id)
      label = match.email
      // A known account that never produced events still resolves to the
      // account itself — show zero rows honestly rather than unfiltered.
      if (ids.length === 0) ids = ['__no_person_match__']
    }
  } else if (UUID_RE.test(raw)) {
    // Try as user_id first (auth accounts), else as a raw distinct_id.
    const fromUser = await distinctIdsForUser(raw)
    if (fromUser.length) {
      ids = fromUser
      label = raw
    } else {
      ids = [raw]
      label = raw
    }
  } else {
    ids = [raw]
    label = raw
  }

  if (ids.length === 0) ids = ['__no_person_match__']

  // Compose with an active cohort pin: intersect (person AND cohort).
  const finalIds = filters.distinctIds?.length
    ? ids.filter((id) => filters.distinctIds!.includes(id))
    : ids
  return {
    ...filters,
    distinctIds: finalIds.length ? finalIds : ['__no_person_match__'],
    personMeta: {
      query: raw,
      resolved: ids[0] === '__no_person_match__' ? 0 : ids.length,
      label,
    },
  }
}
