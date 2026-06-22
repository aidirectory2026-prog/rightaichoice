'use client'

import { useActionState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/actions/auth'
import { continueAsGuest } from '@/lib/auth/guest-client'
import { GoogleSignInButton } from '@/components/auth/google-signin-button'
import { Logo } from '@/components/shared/logo'
import { analytics } from '@/lib/analytics'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, null)
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? ''
  // 10.7c.6 — auth-step events. Email capture is DOMAIN-only (PII rule)
  // and fires once per page visit.
  const emailEnteredRef = useRef(false)
  const onEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    const at = value.lastIndexOf('@')
    if (emailEnteredRef.current || at <= 0 || at === value.length - 1) return
    emailEnteredRef.current = true
    // Domain-only analytics (PII rule) …
    analytics.signupEmailEntered(value.slice(at + 1).toLowerCase(), 'email', 'signup_page')
    // … plus capture the full email so a lead isn't lost if they don't finish
    // signing up. Best-effort, fire-and-forget.
    void fetch('/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: value, source: 'signup_page' }),
    }).catch(() => {})
  }

  if (state?.success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-950 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-emerald-400">
            <path d="M3 10L8 15L17 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Check your email</h1>
        <p className="text-sm text-zinc-400">{state.success}</p>
        <Link href="/login" className="inline-block text-sm text-zinc-400 hover:text-white transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <div className="mb-4"><Logo /></div>
        <h1 className="text-xl font-semibold text-white">Create an account</h1>
        <p className="text-sm text-zinc-400">Join the community of AI explorers</p>
      </div>

      {/* Google sign-in on our own origin (GIS + signInWithIdToken) so the Google
          screen shows rightaichoice.com, not the Supabase project ref. Falls back
          to the classic redirect automatically if GIS is unavailable. The
          beforeSession hook preserves the signup-method analytics. */}
      <GoogleSignInButton
        next={nextParam || null}
        beforeSession={() => analytics.signupMethodSelected('google', 'signup_page')}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-500">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <form
        action={action}
        data-form-id="auth_signup"
        onSubmit={() => analytics.signupMethodSelected('email', 'signup_page')}
        className="space-y-4"
      >
        {/* Phase 7 redirect-back: thread `next` to signUp action so the
            email-confirmation link includes it and /auth/confirm redirects
            the user back to where they signed up from. */}
        {nextParam && <input type="hidden" name="next" value={nextParam} />}
        <div className="space-y-1.5">
          <label htmlFor="username" className="block text-sm font-medium text-zinc-300">
            Username
          </label>
          {/* Phase 7 Step 53 (BUG-011): preserve username after server error. */}
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            defaultValue={state?.values?.username ?? ''}
            placeholder="yourhandle"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
            Email
          </label>
          {/* Phase 7 Step 53 (BUG-011): preserve email after server error. */}
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state?.values?.email ?? ''}
            onBlur={onEmailBlur}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
          />
        </div>

        {state?.error && (
          <p className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? 'Creating account...' : 'Create account'}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              analytics.signupMethodSelected('guest', 'signup_page')
              continueAsGuest(nextParam || null)
            }}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            or continue as guest
          </button>
        </div>

        <p className="text-center text-xs text-zinc-500">
          By signing up you agree to our{' '}
          <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">Privacy Policy</Link>.
        </p>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link
          href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : '/login'}
          className="text-white hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
