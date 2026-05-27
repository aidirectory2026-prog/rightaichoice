/**
 * Phase 9 — POST /api/plan/intent/link
 *
 * Called from components/providers/auth-provider.tsx the first time the
 * user identifies (anon → known transition). UPDATEs every plan_intents row
 * with `distinct_id = ? AND user_id IS NULL` to set user_id = auth.uid().
 *
 * One human = one continuous goal history, even if they typed multiple goals
 * pre-signup and only converted later.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PostBody = { distinct_id?: string }

export async function POST(req: Request) {
  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const distinctId = typeof body.distinct_id === 'string' ? body.distinct_id.slice(0, 200) : ''
  if (!distinctId) return NextResponse.json({ ok: false, error: 'missing_distinct_id' }, { status: 400 })

  // Resolve the calling user — anon callers can't link to a user_id.
  const ssClient = await createClient()
  const { data } = await ssClient.auth.getUser()
  const userId = data.user?.id
  if (!userId) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })

  // UPDATE only the rows that are still anon for this distinct_id.
  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (admin
    .from('plan_intents') as any)
    .update({ user_id: userId })
    .eq('distinct_id', distinctId)
    .is('user_id', null)
    .select('id')

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  const countLinked = Array.isArray(updated) ? updated.length : 0
  return NextResponse.json({ ok: true, count_linked: countLinked })
}
