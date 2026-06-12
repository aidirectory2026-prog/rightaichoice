import { redirect } from 'next/navigation'

// Phase 10.5c.4 — journey merged into the user 360 page as its "Journey"
// tab (sessions timeline + flat event log). Old deep links land there.
export default async function JourneyAlias({ params }: { params: Promise<{ distinct_id: string }> }) {
  const { distinct_id } = await params
  redirect(`/admin/insights/user/${distinct_id}?tab=journey`)
}
