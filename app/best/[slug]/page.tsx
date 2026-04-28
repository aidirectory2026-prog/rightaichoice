import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, ExternalLink } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { ToolLogo } from '@/components/tools/tool-logo'
import { ShareButton } from '@/components/shared/share-button'
import { getBestPageBySlug, BEST_PAGES } from '@/lib/data/best-pages'
import { getTools } from '@/lib/data/tools'
import { pricingLabel, pricingColor } from '@/lib/utils'
import { itemListJsonLd, faqPageJsonLd, breadcrumbJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'

export const revalidate = 3600 // 1 hour

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return BEST_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getBestPageBySlug(slug)
  if (!page) return { title: 'Not Found' }

  return {
    title: `${page.title} (2026)`,
    description: page.description,
    openGraph: {
      title: `${page.title} 2026`,
      description: page.description,
      url: `https://rightaichoice.com/best/${slug}`,
    },
    alternates: {
      canonical: `https://rightaichoice.com/best/${slug}`,
    },
  }
}

export default async function BestPage({ params }: PageProps) {
  const { slug } = await params
  const config = getBestPageBySlug(slug)
  if (!config) notFound()

  // Build filters for tool query
  const filters: Parameters<typeof getTools>[0] = {
    page: 1,
    sort: 'most_reviewed',
  }

  if (config.skillLevel) filters.skill_level = config.skillLevel
  if (config.slug === 'free') filters.pricing = 'free'

  // Query by first category if specified
  const category = config.categories?.[0]
  if (category) filters.category = category

  const { tools } = await getTools(filters)

  // Limit to top 18
  const topTools = tools.slice(0, 18)

  // Structured data
  const itemList = itemListJsonLd(
    config.title,
    config.description,
    `/best/${slug}`,
    topTools.map((t) => ({
      name: t.name,
      url: `/tools/${t.slug}`,
      ...(t.logo_url && { image: t.logo_url }),
    })),
  )

  const faq = faqPageJsonLd([
    {
      question: `What are the ${config.title.toLowerCase()} in 2026?`,
      answer: `The top-rated options include ${topTools.slice(0, 3).map((t) => t.name).join(', ')}. Rankings are based on real user reviews, features, and pricing on RightAIChoice.`,
    },
    {
      question: `Are there free options for ${config.title.toLowerCase().replace('best ai tools for ', '').replace('best free ai tools', 'AI tools')}?`,
      answer: `Yes — many tools on this list offer free tiers or trials. Check each tool's pricing badge for details. Filter by "Free" on our tools page for a complete list.`,
    },
  ])

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Best AI Tools', url: '/best' },
    { name: config.title, url: `/best/${slug}` },
  ])

  return (
    <>
      <script {...jsonLdScriptProps([itemList, faq, breadcrumbs])} />
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <div className="border-b border-zinc-800 bg-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to all tools
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-bold text-white">{config.h1}</h1>
                <p className="mt-3 text-zinc-400 leading-relaxed">{config.description}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  Updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  {' · '}{topTools.length} tools ranked
                </p>
              </div>

              <ShareButton
                url={`/best/${slug}`}
                title={config.title}
                text={`${config.title} (2026) — ranked and compared on RightAIChoice`}
                variant="button"
                size="sm"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          {topTools.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">
              No tools found for this category yet.{' '}
              <Link href="/tools" className="text-emerald-400 hover:text-emerald-300">
                Browse all tools
              </Link>
            </div>
          ) : (
            <>
              {/* Ranked list */}
              <div className="space-y-4 mb-12">
                {topTools.map((tool, index) => {
                  const cats = (tool as { tool_categories?: { categories?: { name: string } }[] }).tool_categories ?? []
                  const categoryName = cats[0]?.categories?.name ?? ''

                  return (
                    <div
                      key={tool.id}
                      className="group relative flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors"
                    >
                      {/* Rank badge */}
                      <div className={[
                        'shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
                        index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                        index === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-zinc-800 text-zinc-500',
                      ].join(' ')}>
                        #{index + 1}
                      </div>

                      {/* Logo */}
                      <ToolLogo
                        tool={tool}
                        size={48}
                        className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden"
                        fallbackClassName="text-lg font-bold text-zinc-400"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Link
                            href={`/tools/${tool.slug}`}
                            className="text-base font-semibold text-white hover:text-emerald-400 transition-colors"
                          >
                            {tool.name}
                          </Link>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pricingColor(tool.pricing_type)}`}>
                            {pricingLabel(tool.pricing_type)}
                          </span>
                          {categoryName && (
                            <span className="text-xs text-zinc-600">{categoryName}</span>
                          )}
                        </div>

                        <p className="text-sm text-zinc-400 line-clamp-2">{tool.tagline}</p>

                        {/* Rating + review count */}
                        {tool.avg_rating && (
                          <div className="mt-2 flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-zinc-400">
                              {tool.avg_rating.toFixed(1)}
                              {tool.review_count ? ` (${tool.review_count} reviews)` : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-2">
                        <Link
                          href={`/tools/${tool.slug}`}
                          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
                        >
                          Details
                        </Link>
                        <a
                          href={tool.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-800 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600/40 transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Visit
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Card grid — remaining tools */}
              {topTools.length > 6 && (
                <>
                  <h2 className="text-lg font-semibold text-white mb-5">All {config.title}</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {topTools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </>
              )}

              {/* CTA */}
              <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Not sure which is right for you?
                </h2>
                <p className="text-sm text-zinc-500 mb-5">
                  Tell our AI your use case and get a personalised recommendation in seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/recommend"
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  >
                    Find My Tool
                  </Link>
                  <Link
                    href="/plan"
                    className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
                  >
                    Plan a full project
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
