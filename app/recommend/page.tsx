import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, RotateCcw, AlertCircle } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { RecommendationWizard } from '@/components/recommendations/recommendation-wizard'
import { RecommendedToolCard } from '@/components/recommendations/recommended-tool-card'
import { getRecommendations } from '@/lib/data/recommendations'

export const metadata: Metadata = {
  title: 'Find My AI Tool — RightAIChoice',
  description:
    'Answer 3 quick questions and get AI-powered tool recommendations tailored to your use case, budget, and skill level.',
}

type Props = {
  searchParams: Promise<{ usecase?: string; budget?: string; level?: string }>
}

const PRICING_LABELS: Record<string, string> = {
  free: 'Free only',
  freemium: 'Free + Freemium',
  paid: 'Paid',
  any: 'Any budget',
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  any: 'Any level',
}

export default async function RecommendPage({ searchParams }: Props) {
  const params = await searchParams
  const usecase = params.usecase?.trim()
  const budget = params.budget
  const level = params.level

  // Show results if all params present
  const showResults = !!usecase

  if (!showResults) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-zinc-950 px-4 py-16">
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <div className="mb-12 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/30 px-4 py-1.5 text-xs font-medium text-emerald-400">
                <Sparkles className="h-3 w-3" />
                AI-Powered Recommendations
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">
                Find your perfect AI tool
              </h1>
              <p className="mt-3 text-zinc-400">
                Answer 3 quick questions. Get personalized recommendations with AI reasoning.
              </p>
            </div>

            <RecommendationWizard />
          </div>
        </main>
      </>
    )
  }

  // Fetch recommendations server-side
  let result = null
  let error = null
  try {
    result = await getRecommendations({
      use_case: usecase,
      pricing_type: budget,
      skill_level: level,
    })
  } catch (e) {
    error = e instanceof Error ? e.message : 'Something went wrong'
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-950 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/30 px-4 py-1.5 text-xs font-medium text-emerald-400">
              <Sparkles className="h-3 w-3" />
              AI Recommendations
            </div>
            <h1 className="text-3xl font-bold text-white">
              Results for &ldquo;{usecase}&rdquo;
            </h1>

            {/* Context chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {budget && budget !== 'any' && (
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                  Budget: {PRICING_LABELS[budget] ?? budget}
                </span>
              )}
              {level && level !== 'any' && (
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
                  Level: {LEVEL_LABELS[level] ?? level}
                </span>
              )}
            </div>

            {/* AI Summary */}
            {result?.summary && (
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed border-l-2 border-emerald-700 pl-3">
                {result.summary}
              </p>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-8 flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-300">Recommendation failed</p>
                <p className="mt-0.5 text-xs text-red-400/70">{error}</p>
              </div>
            </div>
          )}

          {/* Results grid */}
          {result && result.tools.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {result.tools.map((tool, i) => (
                <RecommendedToolCard key={tool.slug} tool={tool} rank={i + 1} />
              ))}
            </div>
          ) : !error ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <p className="text-zinc-400">No matching tools found for your criteria.</p>
              <p className="mt-1 text-sm text-zinc-500">Try broadening your filters.</p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/recommend"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Try different criteria
            </Link>
            <Link
              href="/tools"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Browse all tools →
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
