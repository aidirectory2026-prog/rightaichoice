import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'

// Phase 11 (2026-06-21): capture an email the moment a visitor types a valid one
// on the signup form — even if they never finish signing up. The signUp action
// later flips `converted=true`. Idempotent on email; rate-limited per IP.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const rl = await rateLimit('lead-capture', request, { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 })

  let body: { email?: string; source?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const source = (body.source ?? 'signup').slice(0, 60)

  try {
    // Don't clobber a row already marked converted; only insert if new.
    await getAdminClient()
      .from('email_leads')
      .upsert({ email, source } as never, { onConflict: 'email', ignoreDuplicates: true })
  } catch {
    // best-effort — never surface a capture failure to the visitor
  }
  return NextResponse.json({ ok: true })
}
