export const revalidate = 120

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

export const metadata: Metadata = {
  title: 'Browse AI Tools',
  description: 'Discover and compare AI tools. Filter by category, pricing, platform, and more.',
}

type SearchParams = Promise<{
  category?: string
  pricing?: string
  skill_level?: string
  platform?: string
  has_api?: string
  search?: string
  sort?: string
  page?: string
}>

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  return (
    <>
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header + search */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">
              {params.search
                ? `Results for "${params.search}"`
                : params.category
                  ? 'AI Tools'
                  : 'Browse All AI Tools'}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Discover the right tool for your use case
            </p>
            <div className="mt-4 max-w-xl">
              <SearchBar size="sm" />
            </div>
          </div>

          {/* Filters + Results */}
          <Suspense fallback={<FiltersSkeleton />}>
            <ToolResults params={params} />
          </Suspense>
        </div>
      </main>

      <Footer />
    </>
  )
}

async function ToolResults({
  params,
}: {
  params: {
    category?: string
    pricing?: string
    skill_level?: string
    platform?: string
    has_api?: string
    search?: string
    sort?: string
    page?: string
  }
}) {
  const [categories, { tools, total, page, totalPages }] = await Promise.all([
    getCategories(),
    getTools({
      category: params.category,
      pricing: params.pricing as PricingType | undefined,
      skill_level: params.skill_level as SkillLevel | undefined,
      platform: params.platform as Platform | undefined,
      has_api: params.has_api === 'true' ? true : undefined,
      search: params.search,
      sort: (params.sort as 'trending' | 'newest' | 'most_reviewed' | 'alphabetical') ?? 'trending',
      page: params.page ? parseInt(params.page, 10) : 1,
    }),
  ])

  // Log search query (fire-and-forget, non-blocking)
  if (params.search) {
    logSearch(params.search, total).catch(() => {})
  }

  return (
    <>
      <ToolFilters categories={categories} />

      {tools.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>

          <ToolPagination page={page} totalPages={totalPages} total={total} />
        </>
      ) : (
        <EmptyState search={params.search} categories={categories} />
      )}
    </>
  )
}

const SEARCH_SUGGESTIONS = [
  { label: 'Write blog posts', query: 'writing' },
  { label: 'Generate images', query: 'image generation' },
  { label: 'Build apps with AI', query: 'code' },
  { label: 'Edit videos', query: 'video' },
  { label: 'Automate workflows', query: 'automation' },
  { label: 'Transcribe audio', query: 'transcription' },
]

function EmptyState({
  search,
  categories,
}: {
  search?: string
  categories: { id: string; name: string; slug: string; icon: string | null }[]
}) {
  return (
    <div className="mt-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <span className="text-2xl">🔍</span>
      </div>
      <p className="text-lg text-zinc-300">
        {search ? `No tools found for "${search}"` : 'No tools match your filters'}
      </p>
      <p className="mt-2 text-sm text-zinc-500">
        Try a different search or browse by category
      </p>

      {/* Suggestions */}
      <div className="mt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-600 mb-3">
          Try searching for
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {SEARCH_SUGGESTIONS.map((s) => (
            <Link
              key={s.query}
              href={`/tools?search=${encodeURIComponent(s.query)}`}
              className="rounded-full border border-zinc-800 px-4 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Category shortcuts */}
      {categories.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-600 mb-3">
            Or browse by category
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                href={`/tools?category=${cat.slug}`}
                className="rounded-full border border-zinc-800 px-4 py-1.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-white transition-colors"
              >
                {cat.icon} {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FiltersSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 rounded bg-zinc-800" />
        <div className="h-8 w-32 rounded bg-zinc-800" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-lg bg-zinc-800" />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-zinc-800/50" />
        ))}
      </div>
    </div>
  )
}
