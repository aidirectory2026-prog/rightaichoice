import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles both Google OAuth redirect and email magic-link/reset redirects.
// Supabase sends ?code=... for OAuth and ?token_hash=...&type=... for email flows.

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as
    | 'signup'
    | 'recovery'
    | 'magiclink'
    | null

  const supabase = await createClient()

  // ── OAuth code exchange ──────────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // ── Email link verification (signup confirm / password reset) ────────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
