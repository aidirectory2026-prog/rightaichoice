import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function UserNotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
            <span className="text-2xl">👤</span>
          </div>
          <h1 className="text-2xl font-bold text-white">User not found</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This profile doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Go home
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
