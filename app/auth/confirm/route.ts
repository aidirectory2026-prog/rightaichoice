import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/auth/safe-next'

// Handles email confirmation links.
// Supabase PKCE flow sends ?code=... after verifying the token server-side.
// Older/non-PKCE flow sends ?token_hash=...&type=signup

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'magiclink' | null
  // Phase 7 Step 57 (BUG-020): validate `next` to block open-redirect.
  // See lib/auth/safe-next.ts for the rationale.
  const next = safeNext(searchParams.get('next'))

  const supabase = await createClient()

  // PKCE flow — Supabase already verified the token and gives us a code
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Non-PKCE fallback — verify token_hash directly
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
