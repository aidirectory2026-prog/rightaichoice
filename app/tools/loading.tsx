export default function ToolsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Navbar placeholder */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-950/80" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        {/* Header */}
        <div className="mb-8">
          <div className="h-8 w-64 rounded bg-zinc-800" />
          <div className="mt-2 h-4 w-48 rounded bg-zinc-800/50" />
          <div className="mt-4 h-10 w-full max-w-xl rounded-xl bg-zinc-800" />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 w-24 rounded bg-zinc-800" />
          <div className="h-8 w-32 rounded bg-zinc-800" />
        </div>
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 rounded-lg bg-zinc-800" />
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-lg bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 rounded bg-zinc-800" />
                  <div className="h-3 w-full rounded bg-zinc-800/50" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="h-5 w-16 rounded bg-zinc-800" />
                <div className="h-4 w-12 rounded bg-zinc-800/50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
