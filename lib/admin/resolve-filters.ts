// Phase 14b Wave 2 — one call that turns a page's searchParams into fully
// resolved AdminFilters: parse → cohort pin (?cohort=) → person pin (?person=).
// Person intersects with cohort when both are set. Adopt this in every page
// instead of hand-chaining withCohort/withPerson.

import { parseAdminFilters, type AdminFilters } from '@/lib/admin/filters'
import { withCohort } from '@/lib/admin/cohort-filter'
import { withPerson } from '@/lib/admin/person-filter'

export async function resolveServerFilters(
  sp: Record<string, string | undefined>,
): Promise<AdminFilters> {
  return withPerson(await withCohort(parseAdminFilters(sp), sp), sp)
}
