'use client'

// BUG-27a (Phase 13): a scoped error boundary for the (auth) segment. Without
// it, a thrown error in login / signup / forgot-password / update-password
// bubbles to the GLOBAL boundary, which offers "Browse tools" — useless mid
// sign-in. This one keeps the user in the auth flow (retry + go to login).

import { useEffect } from 'react'
import Link from 'next/link'
import { analytics } from '@/lib/analytics'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
    analytics.errorEncountered('app/(auth)/error', error.message || 'auth render error', {
      error_type: 'react_boundary',
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-2xl font-semibold text-white">Sign-in hit a snag</h1>
        <p className="text-sm text-zinc-400">
          Something went wrong loading this step. Try again, or head back to sign in.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/login"
            className="inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
