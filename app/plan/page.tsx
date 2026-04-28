import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ProjectPlanner } from '@/components/ai/project-planner'
import { createClient } from '@/lib/supabase/server'
import { TOOL_COUNT_DISPLAY } from '@/lib/copy/tool-count'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'AI Project Planner',
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
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-zinc-950 to-zinc-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-teal-500/3 rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-16 pb-12">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-950/30 px-4 py-1.5 text-sm text-emerald-400 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                AI-Powered Project Planner
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                Turn your idea into
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  a complete AI stack
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Describe your goal in plain language. Our AI analyzes {TOOL_COUNT_DISPLAY} tools,
                breaks your project into stages, and recommends the perfect tool
                for each step.
              </p>
            </div>

            <ProjectPlanner initialQuery={initialQuery} isLoggedIn={!!user} />
          </div>
        </div>

        {/* How it works */}
        <div className="border-t border-zinc-800/50 bg-zinc-950">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-zinc-600 mb-10">
              How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-900/50 to-emerald-950 border border-emerald-800/40">
                  <span className="text-lg font-bold text-emerald-400">1</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Describe your goal</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Tell us what you want to build, create, or automate — in your own words.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-900/50 to-teal-950 border border-teal-800/40">
                  <span className="text-lg font-bold text-teal-400">2</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">AI breaks it down</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Our AI decomposes your project into logical stages with clear objectives.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-900/50 to-cyan-950 border border-cyan-800/40">
                  <span className="text-lg font-bold text-cyan-400">3</span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Get your tool stack</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  Each stage gets matched with the best-rated AI tools, with pricing and reasons.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats + CTA */}
        <div className="border-t border-zinc-800/50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-white">{TOOL_COUNT_DISPLAY}</p>
                <p className="text-xs text-zinc-500 mt-1">AI tools analyzed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">15+</p>
                <p className="text-xs text-zinc-500 mt-1">Categories covered</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">~3s</p>
                <p className="text-xs text-zinc-500 mt-1">Avg. plan generation</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">Free</p>
                <p className="text-xs text-zinc-500 mt-1">Always, no signup</p>
              </div>
            </div>

            {/* Related pages */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
              <span className="text-xs text-zinc-600">Explore more:</span>
              <div className="flex flex-wrap justify-center gap-2">
                <Link
                  href="/tools"
                  className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 min-h-[36px] text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                >
                  Browse all tools
                </Link>
                <Link
                  href="/compare"
                  className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 min-h-[36px] text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                >
                  Compare tools
                </Link>
                <Link
                  href="/stacks"
                  className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 min-h-[36px] text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                >
                  AI Stacks
                </Link>
                <Link
                  href="/recommend"
                  className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 min-h-[36px] text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                >
                  Get recommendations
                </Link>
                <Link
                  href="/best"
                  className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 min-h-[36px] text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                >
                  Best-of lists
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
