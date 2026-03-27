export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="text-center max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 mb-8">
          Coming Soon · Step 1 Complete
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Right<span className="text-blue-600">AI</span>Choice
        </h1>
        <p className="text-xl text-gray-500 mb-10">
          The decision-making engine for discovering AI tools.
          <br />
          Search, compare, and choose with confidence.
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-400">Infrastructure ready · Building now</span>
        </div>
      </div>
    </main>
  )
}
