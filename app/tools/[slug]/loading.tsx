import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function ToolDetailLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
          {/* Breadcrumb skeleton */}
          <div className="mb-6 flex items-center gap-2">
            <div className="h-4 w-12 rounded bg-zinc-800" />
            <div className="h-4 w-4 rounded bg-zinc-800" />
            <div className="h-4 w-24 rounded bg-zinc-800" />
          </div>

          {/* Hero skeleton */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="h-20 w-20 shrink-0 rounded-2xl bg-zinc-800" />
              <div>
                <div className="h-7 w-48 rounded bg-zinc-800" />
                <div className="mt-2 h-5 w-80 rounded bg-zinc-800" />
                <div className="mt-3 flex gap-4">
                  <div className="h-4 w-20 rounded bg-zinc-800" />
                  <div className="h-4 w-24 rounded bg-zinc-800" />
                  <div className="h-4 w-28 rounded bg-zinc-800" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-24 rounded-lg bg-zinc-800" />
              <div className="h-10 w-36 rounded-lg bg-zinc-800" />
            </div>
          </div>

          {/* Content grid skeleton */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <div className="h-6 w-40 rounded bg-zinc-800 mb-3" />
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-zinc-800" />
                  <div className="h-4 w-full rounded bg-zinc-800" />
                  <div className="h-4 w-3/4 rounded bg-zinc-800" />
                </div>
              </div>
              <div>
                <div className="h-6 w-32 rounded bg-zinc-800 mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-zinc-800/50" />
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-52 rounded-xl bg-zinc-800/50" />
              <div className="h-28 rounded-xl bg-zinc-800/50" />
              <div className="h-36 rounded-xl bg-zinc-800/50" />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
