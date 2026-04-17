import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serverAnalytics } from '@/lib/mixpanel-server'

// Handles both Google OAuth redirect and email magic-link/reset redirects.
// Supabase sends ?code=... for OAuth and ?token_hash=...&type=... for email flows.
//
// This is the authoritative server-side fire point for signup_completed and
// login_completed — client-side equivalents may be blocked by extensions.

function getClientIp(request: Request): string | undefined {
  const h = request.headers
  return (
    h.get('cf-connecting-ip') ??
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined
  )
}

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
  const ip = getClientIp(request)

  // ── OAuth code exchange ──────────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        // OAuth covers both first-ever signup and return logins. Supabase's
        // created_at vs. last_sign_in_at tells us which. If they differ by
        // <30s, treat as signup.
        const createdAt = new Date(user.created_at ?? 0).getTime()
        const isFresh = Date.now() - createdAt < 30_000
        if (isFresh) {
          await serverAnalytics.signupCompleted(user.id, 'google', ip)
        } else {
          await serverAnalytics.loginCompleted(user.id, 'google', ip)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('OAuth code exchange failed:', error.message)
  }

  // ── Email link verification (signup confirm / password reset) ────────────
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        if (type === 'signup') {
          await serverAnalytics.signupCompleted(user.id, 'email', ip)
        } else if (type === 'magiclink') {
          await serverAnalytics.loginCompleted(user.id, 'magiclink', ip)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('Email verification failed:', error.message)
  }

  // Something went wrong — send to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
