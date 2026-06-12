import { redirect } from 'next/navigation'

// Phase 10.5c.4 — the journeys index is superseded by the Users directory
// (Phase 10.5a: paginated, sortable, filter-bar-aware — strictly more
// capable than the old 5,000-row scan-and-group list). Per-user journeys
// live on the user 360 page's "Journey" tab.
export default function JourneysIndexAlias() {
  redirect('/admin/insights/users')
}
