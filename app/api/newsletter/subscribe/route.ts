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

  return NextResponse.json({ ok: true })
}
