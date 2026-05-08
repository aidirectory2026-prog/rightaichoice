export const revalidate = 300

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { ToolFilters } from '@/components/tools/tool-filters'
import { ToolPagination } from '@/components/tools/tool-pagination'
import { getCategoryBySlug, getCategories } from '@/lib/data/categories'
import { getTools } from '@/lib/data/tools'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'
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
  const category = await getCategoryBySlug(slug)
  if (!category) notFound()

  // Phase 5.5 (2026-05-08): same filter+sort UX as /tools, scoped to this
  // category. ToolFilters is mounted with hideCategoryFilter so users can't
  // accidentally jump categories from this bar.
  const [categories, { tools, total, totalPages }] = await Promise.all([
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
  ])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Best ${category.name} AI Tools`,
    description: `The best ${category.name} AI tools — compared by features, pricing, and community reviews.`,
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
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([
          jsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: 'https://rightaichoice.com' },
            { name: 'Categories', url: 'https://rightaichoice.com/categories' },
            { name: category.name, url: `https://rightaichoice.com/categories/${slug}` },
          ]),
        ]) }}
      />

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

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              {category.icon && <span className="text-4xl">{category.icon}</span>}
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Best {category.name} AI Tools
                </h1>
                <p className="mt-1 text-zinc-400">
                  {total} tool{total !== 1 ? 's' : ''} · ranked by community
                </p>
              </div>
            </div>
            {category.description && (
              <p className="mt-4 max-w-2xl text-sm text-zinc-400 leading-relaxed">
                {category.description}
              </p>
            )}
          </div>

          {/* Filters — Phase 5.5 (2026-05-08). Same UX as /tools, scoped
              to this category. hideCategoryFilter omits the category dropdown
              since the route already locks it. */}
          <div className="mb-6">
            <ToolFilters categories={categories} hideCategoryFilter />
          </div>

          {/* Tools grid */}
          {tools.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
              <p className="text-zinc-500">
                {page > 1
                  ? `No tools on page ${page}.`
                  : 'No tools match these filters in this category.'}
              </p>
              <Link
                href={page > 1 ? `/categories/${slug}` : `/categories/${slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300"
              >
                {page > 1 ? `Back to ${category.name}` : 'Clear filters'}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>

              {/* Phase 5.3 pagination (2026-05-08): replaces the previous
                  "View all N tools → /tools?category=..." escape hatch. The
                  ToolPagination component reads ?page from URL and rewrites
                  it; works the same way as on /tools. */}
              <ToolPagination page={page} totalPages={totalPages} total={total} />
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
