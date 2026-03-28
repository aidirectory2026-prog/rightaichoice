import { Sparkles } from 'lucide-react'

export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/30 px-4 py-1.5">
            <Sparkles className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Finding the best tools for you…</span>
          </div>
          <div className="h-9 w-2/3 animate-pulse rounded-lg bg-zinc-800" />
          <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
        </div>

        {/* Cards skeleton */}
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
              <div className="h-14 animate-pulse rounded-lg bg-zinc-800" />
              <div className="h-9 animate-pulse rounded-lg bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
