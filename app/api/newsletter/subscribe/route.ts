import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Phase 7K (2026-05-16) — newsletter subscribe endpoint.
//
// Single opt-in for now; switches to double opt-in once Resend is
// wired. Idempotent on duplicate email — re-subscribes update source
// instead of failing.

const VALID_SOURCES = new Set([
  'home_hero',
  'plan_completion',
  'mobile_sticky',
  'footer',
  'tool_detail',
  'compare_detail',
  'blog_post',
  'other',
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string; source_entity?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const email = (body.email ?? '').toLowerCase().trim()
  const source = body.source ?? 'other'
  const sourceEntity = body.source_entity ?? null

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  if (!VALID_SOURCES.has(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }
  if (email.length > 254) {
    return NextResponse.json({ error: 'Email too long' }, { status: 400 })
  }

  const supabase = await createClient()

  // Upsert by email so re-subscribes after an unsubscribe re-activate
  // the row + record the new source.
  const { error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      {
        email,
        source,
        source_entity: sourceEntity,
        unsubscribed_at: null,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'email' },
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Phase 8.g.3 — server-side mirror for newsletter_subscribed. Uses email
  // as distinct_id when no signed-in user is available — vendor-segment
  // signal via email_domain is the key property regardless.
  try {
    const { serverAnalytics } = await import('@/lib/mixpanel-server')
    const { data: { user } } = await supabase.auth.getUser()
    const distinctId = user?.id ?? email
    const emailDomain = email.split('@')[1] ?? 'unknown'
    void serverAnalytics.newsletterSubscribedServer(
      distinctId,
      emailDomain,
      source,
      sourceEntity ?? '',
      req.headers.get('x-forwarded-for') ?? undefined,
    )
  } catch {
    // Never block the signup on analytics failure.
  }

  return NextResponse.json({ ok: true })
}
