'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-2xl font-semibold text-white">Something went wrong</h1>
        <p className="text-sm text-zinc-400">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="inline-flex rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
