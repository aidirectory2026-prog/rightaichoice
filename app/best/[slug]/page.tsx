import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, ExternalLink, ChevronDown } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { ToolLogo } from '@/components/tools/tool-logo'
import { ShareButton } from '@/components/shared/share-button'
import { VisitWebsiteButton } from '@/components/tools/visit-website-button'
import { getBestPageBySlug, BEST_PAGES, MIN_INDEXABLE_TOOLS } from '@/lib/data/best-pages'
import { getBestPageTools } from '@/lib/data/best-page-tools'
import { pricingLabel, pricingColor } from '@/lib/utils'
import { itemListJsonLd, faqPageJsonLd, breadcrumbJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'
import { PlanCTAInline } from '@/components/cta/plan-cta-inline'
import { UpdatedBadge } from '@/components/shared/updated-badge'
import { getLastChangedAt } from '@/lib/seo/freshness'

// Caching refactor (fable-5, 2026-06-16): opt into static ISR (no dynamic API
// used; root layout no longer reads cookies). Edge-cached, revalidated hourly +
// on data change via the freshness cascade's revalidatePath.
export const dynamic = 'force-static'
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

  // BUG-06: auto-noindex a thin page (<MIN_INDEXABLE_TOOLS ranked tools), OR'd
  // with the manual flag. cache() dedupes this against the page render below.
  const tools = await getBestPageTools(page)
  const noindex = page.noindex || tools.length < MIN_INDEXABLE_TOOLS

  return {
    title: `${page.title} (2026)`,
    description: page.description,
    openGraph: {
      title: `${page.title} 2026`,
      description: page.description,
      url: `https://rightaichoice.com/best/${slug}`,
      siteName: 'RightAIChoice',
      type: 'article' as const,
    },
    // Phase 10 #44 — rich social card on share (was a bare text link).
    twitter: {
      card: 'summary_large_image' as const,
      title: `${page.title} 2026`,
      description: page.description,
    },
    alternates: {
      canonical: `https://rightaichoice.com/best/${slug}`,
    },
    ...(noindex && { robots: { index: false, follow: true } }),
  }
}

export default async function BestPage({ params }: PageProps) {
  const { slug } = await params
  const config = getBestPageBySlug(slug)
  if (!config) notFound()

  // BUG-06: single source of truth for the ranked list (cache()-deduped with
  // generateMetadata's thin-page gate). Already limited to the top 18.
  const topTools = await getBestPageTools(config)
  const isThin = topTools.length < MIN_INDEXABLE_TOOLS

  // Real "Updated <date>" from pages_freshness for this hub path — reflects
  // the latest user-visible change among the tools featured here (fanned out
  // by the freshness cascade). Non-fatal; falls back internally.
  const freshnessDate = await getLastChangedAt(`/best/${slug}`).catch(() => null)

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

  // Single source of truth for the FAQ — fed to both FAQPage schema and the
  // rendered accordion. Phase 9 (2026-06-04): richer than the old 2 generics,
  // and a direct-answer "Quick answer" block is rendered above the list (the #1
  // AEO lever for "best X" queries — see doc 21).
  const subject = config.title.toLowerCase()
  const top3 = topTools.slice(0, 3).map((t) => t.name)
  const topPick = topTools[0]
  const faqs = [
    {
      question: `What are the ${subject} in 2026?`,
      answer: `${top3.join(', ')} lead our 2026 ranking${topPick ? `, with ${topPick.name} as the top pick` : ''}. The full list is ranked on features, pricing, integrations, and real-world signals — not pay-for-placement.`,
    },
    {
      question: `How much do ${subject} cost?`,
      answer: `Pricing across our ${subject} spans free tiers to paid plans${topPick ? `; ${topPick.name}, our top pick, is ${pricingLabel(topPick.pricing_type).toLowerCase()}` : ''}. Every tool's current pricing badge is shown in the list above, so you can filter to what fits your budget.`,
    },
    {
      question: `Are there free ${subject}?`,
      answer: `Yes — several tools here have a free tier or free trial. Look for the "Free" or "Freemium" pricing badge, or filter the tools directory to free options.`,
    },
    {
      question: `How did RightAIChoice rank these?`,
      answer: `Independently — on features, pricing, integrations, and real-world signals, never pay-for-placement. See our methodology for the full process.`,
    },
  ]
  const faq = faqPageJsonLd(faqs)

  // Sibling best-of guides for internal linking (exclude self + noindex).
  const relatedGuides = BEST_PAGES.filter((p) => p.slug !== slug && !p.noindex).slice(0, 6)

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Best AI Tools', url: '/best' },
    { name: config.title, url: `/best/${slug}` },
  ])

  return (
    <>
      {/* Phase 10 #9 / BUG-06 — only ship ItemList + FAQPage on a NON-THIN page
          (≥MIN_INDEXABLE_TOOLS ranked tools). Thin pages are noindex,follow, so
          emitting their (sparse, near-duplicate) structured data would only feed
          AI Overviews low-value markup — the breadcrumb alone ships there. */}
      <script {...jsonLdScriptProps(isThin ? [breadcrumbs] : [itemList, faq, breadcrumbs])} />
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
                {/* BUG-06 — optional authored intro: 1–2 unique paragraphs so a
                    "best of" page has genuine prose, not just a ranked list. */}
                {config.intro && (
                  <div className="mt-4 space-y-3 text-sm text-zinc-400 leading-relaxed">
                    {config.intro.split('\n\n').map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-600">
                  <UpdatedBadge date={freshnessDate} />
                  <span>{' · '}{topTools.length} tools ranked</span>
                </div>
              </div>

              <ShareButton
                url={`/best/${slug}`}
                title={config.title}
                text={`${config.title} (2026) — ranked and compared on RightAIChoice`}
                variant="button"
                size="sm"
              />
            </div>

            {/* Phase 9 — inline Plan-Your-Stack CTA right after the
                page-hero copy. "Best-of" readers are mid-research; this
                offers them the shortcut: describe the goal, get the match. */}
            <PlanCTAInline context={config.title} />
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
              {/* Bug-4.2 (2026-06-27): inline affiliate disclosure removed —
                  it now lives only on the policy pages (/methodology, /terms). */}

              {/* Quick answer (TL;DR) — direct, extractable answer for "best X"
                  queries (AI Overview / featured snippet bait). */}
              {topPick && (
                <div className="mb-8 rounded-xl border border-emerald-900/40 bg-emerald-950/15 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">Quick answer</p>
                  <p className="text-sm text-zinc-200 leading-relaxed">
                    For most people, <Link href={`/tools/${topPick.slug}`} className="font-semibold text-emerald-300 hover:text-emerald-200">{topPick.name}</Link> is
                    the best pick among {subject} in 2026{topPick.tagline ? ` — ${topPick.tagline.replace(/\.$/, '')}` : ''}.
                    {top3.length > 1 && (
                      <> Top alternatives: {topTools.slice(1, 3).map((t, i) => (
                        <span key={t.id}>
                          <Link href={`/tools/${t.slug}`} className="text-zinc-300 hover:text-emerald-300">{t.name}</Link>{i === 0 && topTools.length > 2 ? ' and ' : ''}
                        </span>
                      ))}.</>
                    )} Ranked on features, pricing, and real-world signals — full list below.
                  </p>
                </div>
              )}

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
                        {/* C3a (Cowork QA): route through /api/tools/[slug]/visit so the
                            affiliate_url is applied + the click is logged (was a raw vendor link). */}
                        <VisitWebsiteButton
                          slug={tool.slug}
                          toolId={tool.id}
                          source="best_page"
                          label="Visit"
                          icon={<ExternalLink className="h-3 w-3" />}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-800 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-600/40 transition-colors"
                        />
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

              {/* FAQ — rendered (crawlable); FAQPage schema emitted once above */}
              <section className="mt-14 max-w-3xl">
                <h2 className="text-lg font-semibold text-white mb-5">Frequently asked questions</h2>
                <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/20">
                  {faqs.map((f) => (
                    <details key={f.question} className="group px-5">
                      <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm font-medium text-zinc-200 marker:content-['']">
                        {f.question}
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="pb-5 text-sm text-zinc-400 leading-relaxed">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>

              {/* Related guides — sibling best-of internal links */}
              {relatedGuides.length > 0 && (
                <section className="mt-12">
                  <h2 className="text-lg font-semibold text-white mb-4">More best-of guides</h2>
                  <div className="flex flex-wrap gap-2">
                    {relatedGuides.map((g) => (
                      <Link
                        key={g.slug}
                        href={`/best/${g.slug}`}
                        className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-sm text-zinc-400 hover:border-emerald-800/50 hover:text-emerald-300 transition-colors"
                      >
                        {g.title}
                      </Link>
                    ))}
                  </div>
                </section>
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
