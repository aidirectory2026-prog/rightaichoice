import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, ExternalLink, Users, Briefcase } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { ShareButton } from '@/components/shared/share-button'
import { getRolePageBySlug, ROLE_PAGES } from '@/lib/data/role-pages'
import { createClient } from '@/lib/supabase/server'
import { pricingLabel, pricingColor } from '@/lib/utils'
import { itemListJsonLd, faqPageJsonLd, breadcrumbJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'

export const revalidate = 3600

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return ROLE_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getRolePageBySlug(slug)
  if (!page) return { title: 'Not Found' }

  return {
    title: `${page.title} (2026) — RightAIChoice`,
    description: page.description,
    openGraph: {
      title: `${page.title} 2026`,
      description: page.description,
      url: `https://rightaichoice.com/for/${slug}`,
    },
    alternates: {
      canonical: `https://rightaichoice.com/for/${slug}`,
    },
  }
}

export default async function RolePage({ params }: PageProps) {
  const { slug } = await params
  const config = getRolePageBySlug(slug)
  if (!config) notFound()

  const supabase = await createClient()

  // Get tool IDs from all relevant categories
  const { data: catTools } = await supabase
    .from('tool_categories')
    .select('tool_id, categories!inner(slug)')
    .in('categories.slug', config.categories)

  const toolIds = [...new Set(catTools?.map((r) => r.tool_id) ?? [])]

  let tools: any[] = []
  if (toolIds.length > 0) {
    const { data } = await supabase
      .from('tools')
      .select('*, tool_categories(category_id, categories(*))')
      .eq('is_published', true)
      .in('id', toolIds)
      .order('review_count', { ascending: false })
      .limit(24)

    tools = data ?? []
  }

  // Structured data
  const itemList = itemListJsonLd(
    config.title,
    config.description,
    `/for/${slug}`,
    tools.slice(0, 10).map((t) => ({
      name: t.name,
      url: `/tools/${t.slug}`,
      ...(t.logo_url && { image: t.logo_url }),
    })),
  )

  const roleName = config.h1.replace('AI Tools for ', '')
  const faq = faqPageJsonLd([
    {
      question: `What are the best AI tools for ${roleName.toLowerCase()} in 2026?`,
      answer: `The top-rated AI tools for ${roleName.toLowerCase()} include ${tools.slice(0, 3).map((t) => t.name).join(', ')}. These are ranked by user reviews, features, and relevance on RightAIChoice.`,
    },
    {
      question: `Are there free AI tools for ${roleName.toLowerCase()}?`,
      answer: `Yes — many tools listed here offer free tiers or generous trials. Look for the "Free" or "Freemium" badges on each tool card.`,
    },
    {
      question: `How do I choose the right AI tools for my workflow?`,
      answer: `Use the RightAIChoice Stack Planner — describe your goal and get a complete AI tool stack recommendation with costs and alternatives for each stage.`,
    },
  ])

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'AI Tools by Role', url: '/for' },
    { name: config.title, url: `/for/${slug}` },
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
              href="/for"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All roles
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">AI Tools by Role</span>
                </div>
                <h1 className="text-3xl font-bold text-white">{config.h1}</h1>
                <p className="mt-3 text-zinc-400 leading-relaxed">{config.intro}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  Updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  {' · '}{tools.length} tools curated
                </p>
              </div>

              <ShareButton
                url={`/for/${slug}`}
                title={config.title}
                text={`${config.title} (2026) — curated and ranked on RightAIChoice`}
                variant="button"
                size="sm"
              />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          {tools.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">
              No tools found for this role yet.{' '}
              <Link href="/tools" className="text-emerald-400 hover:text-emerald-300">
                Browse all tools
              </Link>
            </div>
          ) : (
            <>
              {/* Top picks — ranked list */}
              <h2 className="text-lg font-semibold text-white mb-5">
                Top Picks for {roleName}
              </h2>
              <div className="space-y-4 mb-12">
                {tools.slice(0, 8).map((tool, index) => {
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
                      <div className="shrink-0 h-12 w-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                        {tool.logo_url ? (
                          <img src={tool.logo_url} alt={tool.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-zinc-400">
                            {tool.name[0]}
                          </span>
                        )}
                      </div>

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

              {/* All tools grid */}
              {tools.length > 8 && (
                <>
                  <h2 className="text-lg font-semibold text-white mb-5">
                    All {config.title.replace('Best ', '')}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-12">
                    {tools.map((tool) => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </>
              )}

              {/* Stack CTA */}
              {config.stackSlug && (
                <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-8 text-center mb-8">
                  <h2 className="text-lg font-semibold text-white mb-2">
                    Get the complete stack for {roleName.toLowerCase()}
                  </h2>
                  <p className="text-sm text-zinc-400 mb-5">
                    See a curated, stage-by-stage AI tool stack built specifically for your workflow.
                  </p>
                  <Link
                    href={`/stacks/${config.stackSlug}`}
                    className="inline-flex rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  >
                    View Recommended Stack
                  </Link>
                </div>
              )}

              {/* General CTA */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <h2 className="text-lg font-semibold text-white mb-2">
                  Need a custom AI stack?
                </h2>
                <p className="text-sm text-zinc-500 mb-5">
                  Describe your specific goal and get a personalized tool recommendation in seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/plan"
                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  >
                    Plan Your Stack
                  </Link>
                  <Link
                    href="/tools"
                    className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
                  >
                    Browse All Tools
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
