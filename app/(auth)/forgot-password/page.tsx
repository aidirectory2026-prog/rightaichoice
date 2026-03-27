'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/actions/auth'
import { Logo } from '@/components/shared/logo'

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, null)

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
        <h1 className="text-xl font-semibold text-white">Reset your password</h1>
        <p className="text-sm text-zinc-400">Enter your email and we&apos;ll send a reset link.</p>
      </div>

      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
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
          {pending ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        Remember it?{' '}
        <Link href="/login" className="text-white hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
