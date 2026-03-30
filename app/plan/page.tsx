import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ProjectPlanner } from '@/components/ai/project-planner'

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

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/40 px-4 py-1.5 text-sm text-emerald-400 mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Project Planner
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              What are you trying to build?
            </h1>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Describe your goal in plain language. Our AI breaks it into stages and finds
              the best AI tool for each step — from start to launch.
            </p>
          </div>

          <ProjectPlanner initialQuery={initialQuery} />

        </div>
      </main>
      <Footer />
    </>
  )
}
