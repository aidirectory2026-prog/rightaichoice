'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/auth/safe-next'

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

  // Phase 7 redirect-back: thread `next` into the email-confirmation link so
  // /auth/confirm honors it. User clicks the email link → /auth/confirm
  // verifies the token → redirects to `next` instead of /dashboard.
  const confirmUrl = new URL('/auth/confirm', process.env.NEXT_PUBLIC_APP_URL)
  if (next !== '/dashboard') confirmUrl.searchParams.set('next', next)

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: confirmUrl.toString(),
    },
  })

  if (error) {
    return { error: error.message, values: { username, email } }
  }

  return { success: 'Check your email to confirm your account.' }
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
