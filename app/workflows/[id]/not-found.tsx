import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center">
      <h1 className="text-5xl font-bold text-zinc-600">404</h1>
      <h2 className="mt-4 text-xl font-semibold text-white">Workflow not found</h2>
      <p className="mt-2 text-zinc-500">This workflow may have been removed.</p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/workflows"
          className="rounded-lg border border-zinc-700 px-5 py-2 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
        >
          Browse Workflows
        </Link>
        <Link
          href="/workflows/generate"
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
        >
          Generate New
        </Link>
      </div>
    </main>
  )
}
