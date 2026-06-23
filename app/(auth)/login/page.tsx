'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/actions/auth'
import { continueAsGuest } from '@/lib/auth/guest-client'
import { signInWithOAuthClient } from '@/lib/auth/oauth-client'
import { GoogleSignInButton } from '@/components/auth/google-signin-button'
import { Logo } from '@/components/shared/logo'

const AUTH_ERRORS: Record<string, string> = {
  auth_callback_failed: 'Authentication failed. Please try again.',
  oauth_failed: 'Google sign-in failed. Please try again.',
  confirmation_failed: 'Email confirmation failed. The link may have expired.',
  verify_failed: 'That verification link is invalid or expired. Sign in and resend it from your profile.',
  guest_failed: 'Could not start a guest session. Please try Google or email.',
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null)
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const nextParam = searchParams.get('next') ?? ''
  const authError = errorParam ? AUTH_ERRORS[errorParam] ?? 'Something went wrong. Please try again.' : null

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <div className="mb-4"><Logo /></div>
        <h1 className="text-xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-zinc-400">Sign in to your account</p>
      </div>

      {authError && (
        <p role="alert" className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2 text-center">
          {authError}
        </p>
      )}

      {/* Google sign-in on our own origin (GIS + signInWithIdToken) so the Google
          screen shows rightaichoice.com, not the Supabase project ref. Falls back
          to the classic redirect automatically if GIS is unavailable. */}
      <div className="space-y-2.5">
        <GoogleSignInButton next={nextParam || null} />
        <button
          type="button"
          onClick={() => signInWithOAuthClient('linkedin_oidc', nextParam || null)}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          Continue with LinkedIn
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-500">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <form action={action} data-form-id="auth_login" className="space-y-4">
        {nextParam && <input type="hidden" name="next" value={nextParam} />}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
            Email
          </label>
          {/* Phase 7 Step 53 (BUG-013): preserve email after a failed login.
              Standard pattern — failed-login retries should be a one-field fix
              (just the password). Password is intentionally not preserved. */}
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state?.values?.email ?? ''}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-white transition-colors">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
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
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => continueAsGuest(nextParam || null)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          or continue as guest
        </button>
      </div>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link
          href={nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : '/signup'}
          className="text-white hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
