'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { analytics } from '@/lib/analytics'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Keep the raw error in the console / Sentry breadcrumbs for debugging, but
  // never surface error.message to users — it can leak internals.
  useEffect(() => {
    console.error(error)
    // 10.7c.2 — route-level React boundary tripped: record it so error_rate
    // in /admin reflects rendered-error pages, not just window errors.
    analytics.errorEncountered('app/error', error.message || 'render error', {
      error_type: 'react_boundary',
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    })
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-2xl font-semibold text-white">Something went wrong</h1>
        <p className="text-sm text-zinc-400">
          We hit an unexpected error. You can retry, or head back to a known-good page.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="inline-flex rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/tools"
            className="inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
          >
            Browse tools
          </Link>
        </div>
      </div>
    </main>
  )
}
