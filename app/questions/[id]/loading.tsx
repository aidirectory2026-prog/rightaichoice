import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function QuestionLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb skeleton */}
          <div className="mb-6 flex items-center gap-2">
            <div className="h-4 w-20 rounded bg-zinc-800 animate-pulse" />
            <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
          </div>

          {/* Question skeleton */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <div className="flex gap-4">
              <div className="w-8 space-y-2">
                <div className="h-6 w-6 rounded bg-zinc-800 animate-pulse" />
                <div className="h-4 w-4 rounded bg-zinc-800 animate-pulse mx-auto" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-6 w-3/4 rounded bg-zinc-800 animate-pulse" />
                <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
                <div className="h-4 w-full rounded bg-zinc-800 animate-pulse" />
                <div className="h-4 w-5/6 rounded bg-zinc-800 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Answers skeleton */}
          <div className="mt-8 space-y-4">
            <div className="h-5 w-28 rounded bg-zinc-800 animate-pulse" />
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex gap-3">
                  <div className="w-8 space-y-2">
                    <div className="h-6 w-6 rounded bg-zinc-800 animate-pulse" />
                    <div className="h-4 w-4 rounded bg-zinc-800 animate-pulse mx-auto" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full rounded bg-zinc-800 animate-pulse" />
                    <div className="h-4 w-4/5 rounded bg-zinc-800 animate-pulse" />
                    <div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
