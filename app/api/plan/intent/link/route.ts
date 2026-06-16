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
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PostBody = { distinct_id?: string }

/**
 * H11b (Cowork QA) — ownership proof. The distinct_id Mixpanel uses is stored in
 * a first-party cookie (mp_<token>_mixpanel) that the browser sends to us. Read it
 * and require the body distinct_id to match, so a logged-in user can only link
 * THEIR OWN current anon history — not an arbitrary id harvested from a ?d= leak.
 * Returns null when no Mixpanel cookie is present (ad-blocked → localStorage
 * fallback id, which is a random unguessable UUID; rate-limiting covers that case).
 */
function distinctIdFromMixpanelCookie(req: Request): string | null {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
  if (!token) return null
  const cookieHeader = req.headers.get('cookie') ?? ''
  const name = `mp_${token}_mixpanel=`
  const hit = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(name))
  if (!hit) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(hit.slice(name.length))) as { distinct_id?: unknown }
    return typeof parsed.distinct_id === 'string' ? parsed.distinct_id : null
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  // H11b: rate-limit to stop enumeration / bulk claiming of leaked distinct_ids.
  const rl = await rateLimit('plan-intent-link', req, { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return rateLimitResponse(rl)

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

  // H11b: ownership proof — when the caller's Mixpanel cookie is present, the body
  // distinct_id must match it, so a user can only claim their own anon history.
  const cookieDid = distinctIdFromMixpanelCookie(req)
  if (cookieDid && cookieDid !== distinctId) {
    return NextResponse.json({ ok: false, error: 'distinct_id_mismatch' }, { status: 403 })
  }

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
