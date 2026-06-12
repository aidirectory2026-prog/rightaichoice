import { redirect } from 'next/navigation'

// Phase 10.5c.4 — merged into /admin/health (Pipelines & Health): the
// per-event freshness + super-property quality table, the dead-events list
// and the Mixpanel volume budget all live there now as the
// "Event capture health" section. Old links land on the merged page.
export default function InsightsHealthAlias() {
  redirect('/admin/health')
}
