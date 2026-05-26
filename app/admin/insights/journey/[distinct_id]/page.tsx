import { redirect } from 'next/navigation'

// Journey Explorer reuses the existing /admin/insights/user/[distinct_id]
// timeline page, which already has sessions + replay + flat event log.
// We expose it under /journey/ as well so the new shell's nav stays clean.
export default async function JourneyAlias({ params }: { params: Promise<{ distinct_id: string }> }) {
  const { distinct_id } = await params
  redirect(`/admin/insights/user/${distinct_id}`)
}
