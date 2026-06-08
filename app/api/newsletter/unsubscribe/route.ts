import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { verifyUnsubscribeToken } from '@/lib/newsletter/unsubscribe-token'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'

// Phase 10 #34 — secure unsubscribe.
// - Uses the service-role client: the prior anon client hit an admin-only RLS
//   UPDATE policy and silently affected 0 rows while returning {ok:true}.
// - Prefers a signed token (from the email link) so a caller cannot unsubscribe
//   an arbitrary address; the typed-email self-service path is rate-limited.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const limit = rateLimit('newsletter-unsubscribe', req, { limit: 5, windowMs: 60_000 })
  if (!limit.ok) return rateLimitResponse(limit)

  let body: { email?: string; token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  let email: string | null = null
  if (body.token) {
    email = verifyUnsubscribeToken(body.token)
    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired unsubscribe link' }, { status: 400 })
    }
  } else {
    const typed = (body.email ?? '').toLowerCase().trim()
    if (!EMAIL_RE.test(typed)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    email = typed
  }

  const db = getAdminClient()
  const { error } = await db
    .from('newsletter_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() } as never)
    .eq('email', email)

  if (error) {
    return NextResponse.json({ error: 'Could not unsubscribe — try again' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
