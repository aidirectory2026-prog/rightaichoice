'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/actions/auth'
import { continueAsGuest } from '@/lib/auth/guest-client'
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
      <GoogleSignInButton next={nextParam || null} />

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
