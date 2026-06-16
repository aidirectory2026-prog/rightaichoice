import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isToolSaved } from '@/lib/data/tools'
import { hasUserReviewed } from '@/lib/data/reviews'

// Caching Layer 3 (fable-5, 2026-06-16): per-user tool state, resolved here
// (server, cookie auth) so the tool PAGE itself no longer reads cookies and can
// be statically edge-cached. SaveToolButton + QuickFeedback fetch this on mount
// to fill in their per-user bits (saved / already-reviewed). Never cached.
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ toolId: string }> },
) {
  const { toolId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { saved: false, reviewed: false, loggedIn: false },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const [saved, reviewed] = await Promise.all([
    isToolSaved(toolId, user.id).catch(() => false),
    hasUserReviewed(toolId, user.id).catch(() => false),
  ])

  return NextResponse.json(
    { saved, reviewed, loggedIn: true },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
