'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signUp, signInWithGoogle } from '@/actions/auth'
import { GoogleIcon } from '@/components/shared/google-icon'
import { Logo } from '@/components/shared/logo'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signUp, null)
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? ''

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

      {/* Phase 7 Step 53 (BUG-012): Google CTA is a plain button, not a
          second `<form>`. Two `<form>` elements with submit buttons used to
          let keyboard Tab from the heading land on the OAuth submit BEFORE
          the username field, and any "submit the first form on the page"
          script triggered OAuth instead of the email/password form.
          Phase 7 redirect-back: pass `next` to signInWithGoogle via a
          one-shot FormData so OAuth signups respect the same redirect
          contract as email signups. */}
      <button
        type="button"
        onClick={() => {
          const fd = new FormData()
          if (nextParam) fd.set('next', nextParam)
          signInWithGoogle(fd)
        }}
        className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-500">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <form action={action} className="space-y-4">
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
