import { redirect } from 'next/navigation'

// Phase 10.4.2 — legacy /admin/analytics merges into Insights (the Phase-5
// dashboard rebuild absorbs its tiles). Old URL redirects.
export default function AnalyticsRedirect() {
  redirect('/admin/insights')
}
