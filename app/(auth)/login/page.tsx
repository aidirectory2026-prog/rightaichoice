'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn, signInWithGoogle } from '@/actions/auth'
import { GoogleIcon } from '@/components/shared/google-icon'
import { Logo } from '@/components/shared/logo'

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, null)

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <div className="mb-4"><Logo /></div>
        <h1 className="text-xl font-semibold text-white">Welcome back</h1>
        <p className="text-sm text-zinc-400">Sign in to your account</p>
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-500">or</span>
        <div className="flex-1 h-px bg-zinc-800" />
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

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-white hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
