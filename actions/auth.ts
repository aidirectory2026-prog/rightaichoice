'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/auth/safe-next'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { issueAndSendVerification, createVerificationToken, sendVerificationEmail } from '@/lib/auth/email-verification'

/**
 * Phase 7 Step 53 (BUG-011, BUG-013): action returns the non-secret fields
 * the user just typed so the page can re-fill them after a server error.
 * Never preserve `password` here — leaving it in component state risks
 * leakage into RSC payloads / browser back-forward cache.
 */
type AuthState = {
  error?: string
  success?: string
  values?: { username?: string; email?: string }
} | null

// Phase 7 Step 53 (BUG-010): single canonical password rule shared with FE
// `minLength={PASSWORD_MIN}` so the two policies can never drift again.
const PASSWORD_MIN = 8

// Phase 7 Step 57 (BUG-020): `safeNext` lives in lib/auth/safe-next.ts so the
// /auth/callback and /auth/confirm route handlers can share the same guard.
// Was previously inlined here, leaving the route handlers vulnerable to
// open-redirect (next=//evil.com).

// ─── Sign Up ────────────────────────────────────────────────────────────────

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string
  const next = safeNext(formData.get('next'))

  // BUG-010: enforce 8 chars BEFORE Supabase. Otherwise Supabase's default
  // policy (6 chars) would accept what the FE rejected, and the QA-reported
  // "FE 8 / BE 6" mismatch comes back.
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    return {
      error: `Password must be at least ${PASSWORD_MIN} characters.`,
      values: { username, email },
    }
  }

  // Phase 11 (2026-06-21): instant signup. "Confirm email" is OFF in Supabase,
  // so signUp returns a session immediately — the user is logged in right away
  // (no "check your email" wall, the old drop point). We then run our OWN
  // verification layer: the account shows as unverified until they click the
  // link we email, which they can do now or later from their profile.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })

  if (error) {
    return { error: error.message, values: { username, email } }
  }

  const userId = data.user?.id
  if (userId && process.env.NEXT_PUBLIC_APP_URL) {
    // Fire the verification email; never block signup on it.
    await issueAndSendVerification(userId, email, process.env.NEXT_PUBLIC_APP_URL).catch(() => {})
    // This email converted from a lead (if it was captured pre-submit).
    try {
      await getAdminClient()
        .from('email_leads')
        .upsert({ email, source: 'signup', converted: true } as never, { onConflict: 'email' })
    } catch {
      /* lead bookkeeping is best-effort */
    }
  }

  // Logged in now — go where they intended (or the dashboard).
  revalidatePath('/', 'layout')
  redirect(next)
}

// ─── Resend Email Verification ───────────────────────────────────────────────

/** Re-send the verification link to the currently signed-in user's email. */
export async function resendVerification(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, error: 'You need to be signed in with an email.' }

  // Already verified? No-op success (the UI hides the prompt anyway).
  const admin = getAdminClient()
  const { data: prof } = await admin.from('profiles').select('email_verified').eq('id', user.id).single()
  if ((prof as { email_verified?: boolean } | null)?.email_verified) return { ok: true }

  if (!process.env.NEXT_PUBLIC_APP_URL) return { ok: false, error: 'Server misconfigured.' }
  const raw = await createVerificationToken(user.id, user.email)
  const sent = await sendVerificationEmail(user.email, raw, process.env.NEXT_PUBLIC_APP_URL)
  return sent.ok ? { ok: true } : { ok: false, error: 'Could not send the email — please try again.' }
}

// ─── Sign In ────────────────────────────────────────────────────────────────

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const next = safeNext(formData.get('next'))

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message, values: { email } }
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

// ─── Sign Out ────────────────────────────────────────────────────────────────

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

// ─── Forgot Password / Magic Link ────────────────────────────────────────────

export async function forgotPassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: 'Password reset link sent. Check your email.' }
}

// ─── Update Password ────────────────────────────────────────────────────────

export async function updatePassword(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  // BUG-010: same 8-char rule as signUp; was 6 here.
  if (password.length < PASSWORD_MIN) {
    return { error: `Password must be at least ${PASSWORD_MIN} characters.` }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  // Phase 8.g.3 — server-side fire for password_reset_completed. Reset
  // flows often happen in a fresh session/browser where no client SDK has
  // initialized yet, so server fire is the authoritative one.
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      const { serverAnalytics } = await import('@/lib/mixpanel-server')
      void serverAnalytics.passwordResetCompletedServer(user.id)
    }
  } catch {
    // Never block the password reset on analytics failure.
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// ─── Google OAuth ────────────────────────────────────────────────────────────

export async function signInWithGoogle(formData?: FormData): Promise<void> {
  const supabase = await createClient()
  const next = safeNext(formData?.get('next') ?? null)

  const callbackUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL)
  callbackUrl.searchParams.set('next', next)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    console.error('Google OAuth error:', error?.message ?? 'No redirect URL returned')
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}

// ─── LinkedIn OAuth (Phase 9 — Plan-Your-Stack signup modal) ────────────────

export async function signInWithLinkedIn(formData?: FormData): Promise<void> {
  const supabase = await createClient()
  const next = safeNext(formData?.get('next') ?? null)

  const callbackUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL)
  callbackUrl.searchParams.set('next', next)

  // Supabase Auth uses 'linkedin_oidc' for the OpenID Connect LinkedIn flow
  // (the legacy 'linkedin' provider was deprecated by LinkedIn in 2023).
  // The provider must be enabled + credentials added in Supabase dashboard
  // → Authentication → Providers → LinkedIn (OIDC) before this works.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'linkedin_oidc',
    options: { redirectTo: callbackUrl.toString() },
  })

  if (error || !data.url) {
    console.error('LinkedIn OAuth error:', error?.message ?? 'No redirect URL returned')
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}
