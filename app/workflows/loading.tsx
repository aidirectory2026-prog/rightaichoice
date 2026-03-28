export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-800" />
            <div className="h-4 w-72 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-xl bg-zinc-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
              <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-800" />
              <div className="flex gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-5 w-16 animate-pulse rounded bg-zinc-800" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
