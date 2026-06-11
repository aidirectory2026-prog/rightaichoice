import { redirect } from 'next/navigation'

// Phase 10.4.2 — Dashboard aliases Insights for now; the real dashboard
// rebuild (period-over-period deltas, provenance popovers) is Phase 5.
export default function AdminPage() {
  redirect('/admin/insights')
}
