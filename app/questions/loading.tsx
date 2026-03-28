import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'

export default function QuestionsLoading() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 space-y-2">
            <div className="h-7 w-48 rounded bg-zinc-800 animate-pulse" />
            <div className="h-4 w-80 rounded bg-zinc-800 animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
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
                    <div className="h-4 w-3/4 rounded bg-zinc-800 animate-pulse" />
                    <div className="h-3 w-full rounded bg-zinc-800 animate-pulse" />
                    <div className="h-3 w-40 rounded bg-zinc-800 animate-pulse" />
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
