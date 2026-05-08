export const revalidate = 60

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { SearchBar } from '@/components/layout/search-bar'
import { ToolCard } from '@/components/tools/tool-card'
import { ToolFilters } from '@/components/tools/tool-filters'
import { ToolPagination } from '@/components/tools/tool-pagination'
import Link from 'next/link'
import { getTools, logSearch } from '@/lib/data/tools'
import { getCategories } from '@/lib/data/categories'
import type { PricingType, Platform, SkillLevel } from '@/types'

type SearchParams = Promise<{
  q?: string
  category?: string
  pricing?: string
  skill_level?: string
  platform?: string
  has_api?: string
  sort?: string
  page?: string
}>

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<Metadata> {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const baseTitle = q ? `Search: "${q}"` : 'Search AI Tools'
  const description = q
    ? `Search results for "${q}" across the RightAIChoice catalog — find the AI tool that fits your goal.`
    : 'Search across 1,100+ AI tools by name, tagline, description, or features.'
  return {
    title: baseTitle,
    description,
    // Phase 5.4 (2026-05-08): noindex search results — we don't want
    // /search?q=... pages competing with curated category and tool pages
    // for SEO. Crawlers should land on /tools, /categories/[slug], or
    // /tools/[slug] instead.
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const q = params.q?.trim() ?? ''

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">
              {q ? `Results for "${q}"` : 'Search AI Tools'}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {q
                ? 'Filter or refine the search below.'
                : 'Type a goal, a feature, or a tool name.'}
            </p>
            <div className="mt-4 max-w-xl">
              <SearchBar size="sm" />
            </div>
          </div>

          {q ? (
            <Suspense fallback={<ResultsSkeleton />}>
              <SearchResults q={q} params={params} />
            </Suspense>
          ) : (
            <EmptyPrompt />
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

async function SearchResults({
  q,
  params,
}: {
  q: string
  params: {
    category?: string
    pricing?: string
    skill_level?: string
    platform?: string
    has_api?: string
    sort?: string
    page?: string
  }
}) {
  const [categories, { tools, total, page, totalPages }] = await Promise.all([
    getCategories(),
    getTools({
      search: q,
      category: params.category,
      pricing: params.pricing as PricingType | undefined,
      skill_level: params.skill_level as SkillLevel | undefined,
      platform: params.platform as Platform | undefined,
      has_api: params.has_api === 'true' ? true : undefined,
      sort: (params.sort as 'trending' | 'newest' | 'most_reviewed' | 'alphabetical') ?? 'trending',
      page: params.page ? parseInt(params.page, 10) : 1,
    }),
  ])

  // Fire-and-forget query logging so we know what searches are landing here
  // and what's returning zero results — feeds future catalog gap reports.
  logSearch(q, total).catch(() => {})

  return (
    <>
      <div className="mb-6">
        <ToolFilters categories={categories} />
      </div>

      {tools.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
          <ToolPagination page={page} totalPages={totalPages} total={total} />
        </>
      ) : (
        <NoResults q={q} />
      )}
    </>
  )
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="mt-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <span className="text-2xl">🔍</span>
      </div>
      <p className="text-lg text-zinc-300">No tools matched &ldquo;{q}&rdquo;</p>
      <p className="mt-2 text-sm text-zinc-500">
        Try a broader keyword, or browse by category.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/tools"
          className="rounded-full border border-zinc-800 px-4 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
        >
          Browse all tools
        </Link>
        <Link
          href="/categories"
          className="rounded-full border border-zinc-800 px-4 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
        >
          Browse categories
        </Link>
        <Link
          href="/plan"
          className="rounded-full border border-zinc-800 px-4 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
        >
          Use the planner
        </Link>
      </div>
    </div>
  )
}

function EmptyPrompt() {
  const examples = [
    'video editor without watermark',
    'free transcription tool',
    'AI image generator with API',
    'customer support chatbot',
  ]
  return (
    <div className="mt-12 text-center">
      <p className="text-lg text-zinc-300">What are you looking for?</p>
      <p className="mt-2 text-sm text-zinc-500">
        Search by goal, feature, or tool name.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {examples.map((ex) => (
          <Link
            key={ex}
            href={`/search?q=${encodeURIComponent(ex)}`}
            className="rounded-full border border-zinc-800 px-4 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
          >
            {ex}
          </Link>
        ))}
      </div>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-32 rounded bg-zinc-800" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-zinc-800/50" />
        ))}
      </div>
    </div>
  )
}
