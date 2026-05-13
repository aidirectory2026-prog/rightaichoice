export const revalidate = 300

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { ToolFilters } from '@/components/tools/tool-filters'
import { ToolPagination } from '@/components/tools/tool-pagination'
import { ToolGridSkeleton } from '@/components/tools/tool-card-skeleton'
import { getCategoryBySlug, getCategories } from '@/lib/data/categories'
import { getTools } from '@/lib/data/tools'
import { breadcrumbJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'
import { getRelatedComparesForCategory } from '@/lib/seo/internal-links'
import { RelatedComparesRail } from '@/components/seo/related-compares'
import type { PricingType, Platform, SkillLevel } from '@/types'

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
    pricing?: string
    skill_level?: string
    platform?: string
    has_api?: string
    sort?: string
  }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const category = await getCategoryBySlug(slug)
  if (!category) return { title: 'Category Not Found' }

  // Phase 5.3 pagination (2026-05-08): page > 1 keeps a separate canonical
  // (with ?page=N) so Google indexes deeper pages without collapsing them
  // onto the root. Title also gets a "(Page N)" suffix for clarity.
  const baseTitle = `Best ${category.name} AI Tools in 2026`
  const title = page > 1 ? `${baseTitle} (Page ${page})` : baseTitle
  const description =
    category.description
      ? `${category.description} Find and compare the best ${category.name} AI tools with real reviews, pricing, and alternatives.`
      : `Find and compare the best ${category.name} AI tools. Real reviews, pricing comparison, and community insights.`

  const canonicalPath = page > 1 ? `/categories/${slug}?page=${page}` : `/categories/${slug}`

  return {
    title,
    description,
    keywords: [
      `best ${category.name} AI tools`,
      `${category.name} AI`,
      `${category.name} tools 2026`,
      `compare ${category.name} tools`,
      category.name,
    ],
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: 'website',
    },
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  // Phase 6.5 (2026-05-12): only block on the lightweight category lookup.
  // Heavy work (categories list + filtered tools query) moved into the
  // streamed CategoryResults child so we can render a Suspense skeleton.
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://rightaichoice.com' },
    { name: 'Categories', url: 'https://rightaichoice.com/categories' },
    { name: category.name, url: `https://rightaichoice.com/categories/${slug}` },
  ])

  return (
    <>
      <Navbar />
      <script {...jsonLdScriptProps(breadcrumbs)} />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500">
            <Link href="/categories" className="hover:text-white transition-colors">
              Categories
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-300">{category.name}</span>
          </nav>

          {/* Header — paints immediately. Tool count moved into the
              streamed CategoryResults child so the page-shell renders
              before the DB aggregate completes. */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              {category.icon && <span className="text-4xl">{category.icon}</span>}
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Best {category.name} AI Tools
                </h1>
                <p className="mt-1 text-zinc-400">Ranked by community</p>
              </div>
            </div>
            {category.description && (
              <p className="mt-4 max-w-2xl text-sm text-zinc-400 leading-relaxed">
                {category.description}
              </p>
            )}
          </div>

          {/* Phase 6.5 (2026-05-12): grid + filters streamed via Suspense
              with a shared skeleton fallback so the page paints fast and
              avoids layout shift when data lands. */}
          <Suspense fallback={<CategoryResultsSkeleton />}>
            <CategoryResults
              slug={slug}
              page={page}
              categoryName={category.name}
              categoryId={category.id}
              sp={sp}
            />
          </Suspense>
        </div>
      </main>

      <Footer />
    </>
  )
}

async function CategoryResults({
  slug,
  page,
  categoryName,
  categoryId,
  sp,
}: {
  slug: string
  page: number
  categoryName: string
  categoryId: string
  sp: {
    page?: string
    pricing?: string
    skill_level?: string
    platform?: string
    has_api?: string
    sort?: string
  }
}) {
  const [categories, { tools, total, totalPages }, relatedCompares] = await Promise.all([
    getCategories(),
    getTools({
      category: slug,
      pricing: sp.pricing as PricingType | undefined,
      skill_level: sp.skill_level as SkillLevel | undefined,
      platform: sp.platform as Platform | undefined,
      has_api: sp.has_api === 'true' ? true : undefined,
      sort: (sp.sort as 'trending' | 'newest' | 'most_reviewed' | 'alphabetical') ?? 'trending',
      page,
    }),
    // Phase 7H — featured comparisons in this category. Adds 6 contextual
    // outbound editorial links to a page that previously had only a
    // breadcrumb + pagination. Only fetched on page 1 to keep deeper
    // pagination snappy.
    page === 1 ? getRelatedComparesForCategory(categoryId, 6).catch(() => []) : Promise.resolve([]),
  ])

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${categoryName} AI Tools`,
    description: `The best ${categoryName} AI tools — compared by features, pricing, and community reviews.`,
    url: `https://rightaichoice.com/categories/${slug}`,
    numberOfItems: total,
    ...(tools.length > 0 && {
      itemListElement: tools.slice(0, 10).map((tool: { name: string; slug: string; tagline: string }, i: number) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: tool.name,
        description: tool.tagline,
        url: `https://rightaichoice.com/tools/${tool.slug}`,
      })),
    }),
  }

  return (
    <>
      <script {...jsonLdScriptProps(itemList)} />
      <p className="-mt-4 mb-6 text-xs text-zinc-500">
        {total} tool{total !== 1 ? 's' : ''} found
      </p>
      <div className="mb-6">
        <ToolFilters categories={categories} hideCategoryFilter />
      </div>
      {tools.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <p className="text-zinc-500">
            {page > 1
              ? `No tools on page ${page}.`
              : 'No tools match these filters in this category.'}
          </p>
          <Link
            href={`/categories/${slug}`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300"
          >
            {page > 1 ? `Back to ${categoryName}` : 'Clear filters'}
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
          <ToolPagination page={page} totalPages={totalPages} total={total} />
          {relatedCompares.length > 0 && (
            <RelatedComparesRail
              compares={relatedCompares}
              heading={`Featured ${categoryName} comparisons`}
            />
          )}
        </>
      )}
    </>
  )
}

function CategoryResultsSkeleton() {
  return (
    <>
      <div className="-mt-4 mb-6 h-3 w-24 rounded bg-zinc-800 animate-pulse" />
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-lg bg-zinc-800 animate-pulse" />
        ))}
      </div>
      <ToolGridSkeleton count={9} cols="category" />
    </>
  )
}
