import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ProjectPlanner } from '@/components/ai/project-planner'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'AI Project Planner — RightAIChoice',
  description:
    'Describe what you want to build or accomplish. Our AI breaks it into stages and recommends the best AI tool for each step.',
}

type PageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function PlanPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const initialQuery = sp.q ?? ''

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero section */}
        <div className="relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-zinc-950 to-zinc-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-12">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-950/30 px-4 py-1.5 text-sm text-emerald-400 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                AI-Powered Project Planner
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                What are you trying
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  to build?
                </span>
              </h1>
              <p className="mt-5 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Describe your goal in plain language. Our AI breaks it into stages
                and finds the best tool for each step.
              </p>
            </div>

            <ProjectPlanner initialQuery={initialQuery} isLoggedIn={!!user} />
          </div>
        </div>

        {/* Trust bar */}
        <div className="border-t border-zinc-800/50">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-2xl font-bold text-white">500+</p>
                <p className="text-xs text-zinc-500 mt-1">AI tools analyzed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">15+</p>
                <p className="text-xs text-zinc-500 mt-1">Categories covered</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">2s</p>
                <p className="text-xs text-zinc-500 mt-1">Avg. plan generation</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
