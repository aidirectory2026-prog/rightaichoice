import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }
  const email = (body.email ?? '').toLowerCase().trim()
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ unsubscribed_at: new Date().toISOString() } as never)
    .eq('email', email)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
