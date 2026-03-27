import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-6xl font-bold text-zinc-700">404</p>
        <h1 className="text-xl font-semibold text-white">Page not found</h1>
        <p className="text-sm text-zinc-400">The page you're looking for doesn't exist or has been moved.</p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
