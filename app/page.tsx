export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-4 py-1.5 text-sm font-medium text-zinc-300 mb-8">
          Coming Soon
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-white mb-4">
          Right<span className="text-emerald-400">AI</span>Choice
        </h1>
        <p className="text-xl text-zinc-400 mb-10">
          The decision-making engine for discovering AI tools.
          <br />
          Search, compare, and choose with confidence.
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-zinc-500">Infrastructure ready</span>
        </div>
      </div>
    </main>
  )
}
