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
import { PageEventTracker } from '@/components/analytics/page-event-tracker'
import { getCategoryBySlug, getCategories } from '@/lib/data/categories'
import { getTools } from '@/lib/data/tools'
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
  jsonLdScriptProps,
} from '@/lib/seo/json-ld'
import { buildCategoryPageMeta } from '@/lib/seo/metadata'
import { getRelatedComparesForCategory } from '@/lib/seo/internal-links'
import { RelatedComparesRail } from '@/components/seo/related-compares'
import { PlanCTAInline } from '@/components/cta/plan-cta-inline'
import { CornerstoneSection } from '@/components/seo/cornerstone-section'
import { getCornerstone } from '@/lib/cornerstones/registry'
import { UpdatedBadge } from '@/components/shared/updated-badge'
import { getLastChangedAt } from '@/lib/seo/freshness'
import { getRelatedBestPages } from '@/lib/seo/best-page-links'
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
  const longDesc = category.description
    ? `${category.description} Find and compare the best ${category.name} AI tools with real ratings, pricing, and alternatives.`
    : null

  const base = buildCategoryPageMeta(category.name, slug, page, longDesc)

  // Phase 9 (2026-05-28): cornerstone-aware metadata. When a hand-written
  // editorial cornerstone exists for this slug, override the templated
  // title + description on page 1 so the SERP snippet reflects the
  // editorial framing ("Best AI Coding Tools 2026: Cursor, Copilot…")
  // instead of the generic "Best <Category> AI Tools" template.
  const cornerstone = getCornerstone(slug)
  if (cornerstone && page === 1) {
    return {
      ...base,
      // absolute bypasses the root layout's "%s | RightAIChoice" template —
      // cornerstone metaTitles already include the brand suffix, so without
      // this the title doubles ("… | RightAIChoice | RightAIChoice").
      title: { absolute: cornerstone.metaTitle },
      description: cornerstone.metaDescription,
      keywords: [
        `best ${category.name} AI tools`,
        `${category.name} AI`,
        `${category.name} tools 2026`,
        `compare ${category.name} tools`,
        category.name,
      ],
      openGraph: {
        title: cornerstone.metaTitle,
        description: cornerstone.metaDescription,
        url: base.alternates.canonical,
        type: 'article',
      },
    }
  }

  return {
    ...base,
    keywords: [
      `best ${category.name} AI tools`,
      `${category.name} AI`,
      `${category.name} tools 2026`,
      `compare ${category.name} tools`,
      category.name,
    ],
    openGraph: {
      title: base.title,
      description: base.description,
      url: base.alternates.canonical,
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

  // Real "Updated <date>" from pages_freshness for this category hub path —
  // reflects the latest user-visible change among the tools in this category
  // (fanned out by the freshness cascade). Non-fatal; falls back internally.
  const freshnessDate = await getLastChangedAt(`/categories/${slug}`).catch(
    () => null,
  )

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: 'https://rightaichoice.com' },
    { name: 'Categories', url: 'https://rightaichoice.com/categories' },
    { name: category.name, url: `https://rightaichoice.com/categories/${slug}` },
  ])

  // Dept D — /best guides relevant to this category (static config match).
  const relatedBestPages = getRelatedBestPages({
    categorySlugs: [slug],
    text: `${category.name} ${category.description ?? ''}`,
    limit: 6,
  })

  // Phase 9 (2026-05-28): cornerstone editorial layer. When the slug has a
  // registered cornerstone, render the long-form editorial above the
  // listing AND emit Article + FAQPage JSON-LD so the page can rank for
  // its broad short-tail query, not just as a listing.
  const cornerstone = page === 1 ? getCornerstone(slug) : null
  const jsonLdPayload: Record<string, unknown>[] = [breadcrumbs]
  if (cornerstone) {
    jsonLdPayload.push(
      articleJsonLd({
        headline: cornerstone.metaTitle,
        description: cornerstone.metaDescription,
        url: `/categories/${slug}`,
        datePublished: cornerstone.publishedISO,
        dateModified: cornerstone.lastReviewedISO,
      }),
      faqPageJsonLd(cornerstone.faqs),
    )
  }

  return (
    <>
      <Navbar />
      <script {...jsonLdScriptProps(jsonLdPayload)} />

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

          {cornerstone ? (
            // Cornerstone replaces the generic header — the editorial h1,
            // subtitle, byline, picks, top compares, prose, and FAQ all
            // render inline. The "Browse all tools" sub-header sits at the
            // bottom of CornerstoneSection, leading into the listing.
            <>
              <CornerstoneSection cornerstone={cornerstone} />
              <PlanCTAInline context={`${category.name} AI tools`} />
            </>
          ) : (
            // Generic header — paints immediately. Tool count moved into
            // the streamed CategoryResults child so the page-shell renders
            // before the DB aggregate completes.
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
              <div className="mt-3">
                <UpdatedBadge date={freshnessDate} />
              </div>

              {/* Phase 9 — inline CTA after category intro paragraph. Highest
                  conversion intent on a category page is right after the user
                  reads "what is this category" copy. */}
              <PlanCTAInline context={`${category.name} AI tools`} />
            </div>
          )}

          {/* Dept D (fable 5 review) — internal links into the /best guides
              for this category (indexed but ~pos 69; the footer hub was
              their only inbound link). */}
          {relatedBestPages.length > 0 && (
            <div className="mb-8 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Best-of guides:
              </span>
              {relatedBestPages.map((bp) => (
                <Link
                  key={bp.slug}
                  href={`/best/${bp.slug}`}
                  className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm text-zinc-400 hover:border-emerald-800/50 hover:text-emerald-300 transition-colors"
                >
                  {bp.label}
                </Link>
              ))}
            </div>
          )}

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
    description: `The best ${categoryName} AI tools — compared by features, current pricing, and real-world signals.`,
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
      <PageEventTracker event="category_viewed" props={{ slug }} />
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
