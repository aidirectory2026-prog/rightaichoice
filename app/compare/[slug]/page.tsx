import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ComparisonTable } from '@/components/compare/comparison-table'
import { ComparePageActions } from '@/components/compare/compare-page-actions'
import { VisitWebsiteButton } from '@/components/tools/visit-website-button'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import { sanitizeEditorialMdx } from '@/lib/mdx-sanitize'
import { mdxComponents } from '@/components/blog/mdx-components'
import {
  getComparisonBySlug,
  getToolsForComparisonByIds,
} from '@/lib/data/comparisons'
import { faqPageJsonLd, breadcrumbJsonLd, jsonLdScriptProps, articleJsonLd, comparisonJsonLd } from '@/lib/seo/json-ld'
import { ReviewedByOurTeam } from '@/components/seo/reviewed-by-our-team'
import { UpdatedBadge } from '@/components/shared/updated-badge'
import { getLastChangedAt } from '@/lib/seo/freshness'
import { buildComparePageMeta } from '@/lib/seo/metadata'
import { getTitleOverride } from '@/lib/seo/title-overrides'
import { getRelatedComparesForPair } from '@/lib/seo/internal-links'
import { RelatedComparesRail } from '@/components/seo/related-compares'
import { ViewTracker } from '@/components/analytics/view-tracker'
import { CompareViewTracker } from '@/components/compare/compare-view-tracker'

type TldrRow = { dimension: string; values: Record<string, string> }
type UseCaseRow = { persona: string; recommendedSlug: string; reasoning: string }
type BenchmarkRow = {
  dimension: string
  values: Record<string, { score: string; unit?: string; source?: string }>
}
type FaqRow = { question: string; answer: string }

type EditorialComparison = {
  tldr?: TldrRow[] | null
  verdict?: string | null
  feature_analysis?: string | null
  pricing_analysis?: string | null
  use_cases?: UseCaseRow[] | null
  benchmarks?: BenchmarkRow[] | null
  faqs?: FaqRow[] | null
  is_editorial?: boolean | null
  published_at?: string | null
  last_reviewed_at?: string | null
}

type Props = { params: Promise<{ slug: string }> }

// Root layout reads auth cookies, so every page is implicitly dynamic.
// Force this route dynamic to match — keeping generateStaticParams would
// trigger DYNAMIC_SERVER_USAGE at request time.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)
  if (!comparison) return { title: 'Comparison Not Found' }

  const tools = await getToolsForComparisonByIds(comparison.tool_ids as string[])
  const names = tools.map((t) => (t as { name: string }).name)
  const meta = buildComparePageMeta(names, slug, {
    publishedAt: (comparison as { published_at?: string | null }).published_at ?? null,
    lastReviewedAt:
      (comparison as { last_reviewed_at?: string | null }).last_reviewed_at ?? null,
  })

  // Phase 9 Tier-1: per-page title overrides for CTR rewrites.
  const override = await getTitleOverride(`/compare/${slug}`)
  const titled = override ? { ...meta, title: { absolute: override } } : meta

  // Phase 9 noindex sweep — emit robots: noindex,follow for flagged compares.
  const noindex = (comparison as { noindex?: boolean | null }).noindex === true
  return noindex
    ? { ...titled, robots: { index: false, follow: true } }
    : titled
}

export default async function ComparisonSlugPage({ params }: Props) {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)

  if (!comparison) notFound()

  const tools = await getToolsForComparisonByIds(comparison.tool_ids as string[])

  // Phase 10 #27/#68 — a comparison with <2 existing tools used to render a
  // styled "Tools Not Found" page at HTTP 200, which Google treats as a soft-404
  // and which dragged down crawl trust for the whole /compare set. Return a real
  // 404 instead. (The 14 live broken comparisons are cleaned up in S8.)
  if (tools.length < 2) notFound()

  const toolNames = tools.map((t) => (t as { name: string }).name)
  const toolSlugs = tools.map((t) => (t as { slug: string }).slug)
  const editorial = comparison as EditorialComparison

  // Phase 9 (2026-06-05) — category internal links. Both tools carry
  // tool_categories(categories(*)); dedupe and link the category hubs so the
  // compare flows topical authority to /categories and gives users a way up the
  // tree (was a gap — compares only linked tools + sibling compares). See doc 22.
  type CatRef = { slug: string; name: string }
  const compareCategories: CatRef[] = Array.from(
    new Map(
      (tools as Array<{ tool_categories?: Array<{ categories?: CatRef | null }> | null }>)
        .flatMap((t) => t.tool_categories ?? [])
        .map((tc) => tc.categories)
        .filter((c): c is CatRef => Boolean(c))
        .map((c) => [c.slug, { slug: c.slug, name: c.name }] as [string, CatRef]),
    ).values(),
  ).slice(0, 4)

  // Universal-propagation badge (B2): real "Updated <date>" sourced from
  // pages_freshness.last_changed_at for this compare path — so when a
  // referenced tool changes and the cascade fans out, this badge reflects the
  // actual change date. Falls back to last_reviewed_at/published_at when no
  // pages_freshness row exists yet. Non-fatal.
  const freshnessDate = await getLastChangedAt(`/compare/${slug}`).catch(
    () => null,
  )

  // Phase 7H — fetch sibling editorial compares featuring either tool
  // for the bottom internal-linking rail. Limited to 6 cards; helper
  // dedups against the current pair_slug so we don't link back to
  // ourselves. Failure is non-fatal (rail just renders nothing).
  const relatedCompares = await getRelatedComparesForPair(
    (tools[0] as { id: string }).id,
    (tools[1] as { id: string }).id,
    slug,
    6
  ).catch(() => [])

  const fmtRating = (r: unknown): string => {
    const n = typeof r === 'number' ? r : parseFloat(String(r ?? ''))
    return Number.isFinite(n) && n > 0 ? n.toFixed(1) : 'N/A'
  }

  const genericFaqs: FaqRow[] = [
    {
      question: `Which is better, ${toolNames[0]} or ${toolNames[1]}?`,
      answer: `The best choice between ${toolNames[0]} and ${toolNames[1]} depends on your specific use case. ${toolNames[0]} has a rating of ${fmtRating((tools[0] as { avg_rating: unknown }).avg_rating)}/5 and ${toolNames[1]} has a rating of ${fmtRating((tools[1] as { avg_rating: unknown }).avg_rating)}/5 based on real user reviews.`,
    },
    {
      question: `What are the main differences between ${toolNames[0]} and ${toolNames[1]}?`,
      answer: `The key differences include pricing model, feature set, platform support, and skill level requirements. Review the full comparison on RightAIChoice for a detailed breakdown.`,
    },
    {
      question: `Is there a free version of ${toolNames[0]} or ${toolNames[1]}?`,
      answer: `Check the pricing section in the comparison for the latest pricing details on both tools, including free tiers, trial options, and paid plans.`,
    },
  ]
  const displayedFaqs: FaqRow[] =
    Array.isArray(editorial.faqs) && editorial.faqs.length > 0 ? editorial.faqs : genericFaqs

  const faq = faqPageJsonLd(displayedFaqs)
  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Compare', url: '/compare' },
    { name: toolNames.join(' vs '), url: `/compare/${slug}` },
  ])
  // Phase 7 Step 59 (BUG-021): emit ItemList of SoftwareApplications for
  // each tool in the comparison. Editorial route already had FAQ + Breadcrumb
  // + optional Article schema; the missing piece was the tools themselves
  // expressed as structured products.
  const itemList = comparisonJsonLd(
    tools as unknown as Parameters<typeof comparisonJsonLd>[0],
    `/compare/${slug}`,
  )

  const jsonLdBlocks: Record<string, unknown>[] = [faq, breadcrumbs, itemList]
  // Phase 10 #42 — only emit the Article block when there's a REAL publish date.
  // The old `?? new Date()` fallback stamped "published today" on every crawl of
  // an editorial with a null date — dishonest freshness signalling.
  if (editorial.is_editorial && editorial.published_at) {
    jsonLdBlocks.push(
      articleJsonLd({
        headline: `${toolNames.join(' vs ')} — AI Tool Comparison`,
        description: `In-depth side-by-side comparison of ${toolNames.join(' and ')}.`,
        url: `/compare/${slug}`,
        datePublished: editorial.published_at,
        dateModified: editorial.last_reviewed_at ?? editorial.published_at,
      }),
    )
  }

  const toolBySlug = new Map(
    tools.map((t) => [(t as { slug: string }).slug, t as { slug: string; name: string }]),
  )

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdBlocks)} />
      {/* Phase 8.next Stage 3 (2026-05-13): increments
          tool_comparisons.view_count via /api/views/compare/[id] on
          mount. Same dedup + bot filter as /tools/[slug]. */}
      <ViewTracker entityType="compare" entityId={comparison.id as string} />
      {/* Mixpanel/Supabase comparison_viewed — mount-once client tracker so
          the /admin compare dashboards stop reading a never-fired event.
          categoriesRepresented is empty: the comparison query doesn't join
          tool categories, so we keep it minimal rather than add a fetch. */}
      <CompareViewTracker
        toolSlugs={toolSlugs}
        isEditorialCompare={editorial.is_editorial === true}
        compareSlug={slug}
        categoriesRepresented={[]}
      />
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            {/* Phase 7B.seo (2026-05-13): visual breadcrumb trail.
                Page-level BreadcrumbList JSON-LD already emitted above
                via jsonLdBlocks; the Breadcrumbs component would also
                emit one (duplicate), so we render the visual nav inline
                here instead of importing Breadcrumbs. */}
            <nav
              aria-label="Breadcrumb"
              className="mb-4 flex items-center gap-1.5 text-sm text-zinc-500"
            >
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-zinc-300">{toolNames.join(' vs ')}</span>
            </nav>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {toolNames.join(' vs ')}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Side-by-side comparison of features, pricing, and ratings
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {/* Universal "Updated <date>" — every compare, sourced from
                      pages_freshness so a referenced-tool change reflects here. */}
                  <UpdatedBadge date={freshnessDate} />
                  {editorial.is_editorial &&
                    (editorial.last_reviewed_at || editorial.published_at) && (
                      <ReviewedByOurTeam
                        date={
                          new Date(
                            (editorial.last_reviewed_at ??
                              editorial.published_at) as string,
                          )
                        }
                      />
                    )}
                </div>
              </div>
              <ComparePageActions
                toolSlugs={toolSlugs}
                toolIds={tools.map((t) => (t as { id: string }).id)}
                savedSlug={slug}
              />
            </div>
          </div>

          {/* At a glance — hero snippet bait, editorial pages only */}
          {editorial.is_editorial && Array.isArray(editorial.tldr) && editorial.tldr.length > 0 && (
            <section className="mb-10 rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-5">
              <h2 className="text-sm font-semibold text-emerald-300 mb-3">At a glance</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-emerald-900/40">
                      <th className="text-left py-2 pr-4 font-medium text-zinc-400">Dimension</th>
                      {toolSlugs.map((s: string) => (
                        <th key={s} className="text-left py-2 pr-4 font-medium text-white">
                          {(toolBySlug.get(s) as { name: string } | undefined)?.name ?? s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editorial.tldr.map((row, i) => (
                      <tr key={i} className="border-b border-emerald-900/20 last:border-0">
                        <td className="py-2 pr-4 text-zinc-400">{row.dimension}</td>
                        {toolSlugs.map((s: string) => (
                          <td key={s} className="py-2 pr-4 text-zinc-200">
                            {row.values?.[s] ?? '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editorial.verdict && (
                <p className="mt-4 text-sm text-zinc-300 italic border-l-2 border-emerald-600 pl-3">
                  {editorial.verdict}
                </p>
              )}
              {/* Dept B — the verdict is the highest-intent moment on the
                  site; give the reader a tracked next step for each tool
                  instead of making them scroll back to the table header. */}
              <div className="mt-4 flex flex-wrap gap-2">
                {tools.map((t) => {
                  const tt = t as { id: string; slug: string; name: string; website_url: string }
                  return (
                    <VisitWebsiteButton
                      key={tt.id}
                      slug={tt.slug}
                      url={tt.website_url}
                      toolId={tt.id}
                      source="compare_verdict"
                      label={`Try ${tt.name}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
                    />
                  )
                })}
              </div>
            </section>
          )}

          {/* Comparison Table */}
          <ComparisonTable tools={tools as unknown as Parameters<typeof ComparisonTable>[0]['tools']} />

          {/* Feature analysis — editorial long-form */}
          {editorial.is_editorial && editorial.feature_analysis && (
            <section className="mt-12 border-t border-zinc-800 pt-10">
              <h2 className="text-lg font-semibold text-white mb-4">Feature-by-feature</h2>
              <div className="prose-custom">
                <MDXRemote
                  source={sanitizeEditorialMdx(editorial.feature_analysis)}
                  components={mdxComponents}
                  options={{ mdxOptions: {}, blockJS: true, blockDangerousJS: true }}
                />
              </div>
            </section>
          )}

          {/* Pricing analysis */}
          {editorial.is_editorial && editorial.pricing_analysis && (
            <section className="mt-12 border-t border-zinc-800 pt-10">
              <h2 className="text-lg font-semibold text-white mb-4">Pricing compared</h2>
              <div className="prose-custom">
                <MDXRemote
                  source={sanitizeEditorialMdx(editorial.pricing_analysis)}
                  components={mdxComponents}
                  options={{ mdxOptions: {}, blockJS: true, blockDangerousJS: true }}
                />
              </div>
            </section>
          )}

          {/* Use-case matrix */}
          {editorial.is_editorial && Array.isArray(editorial.use_cases) && editorial.use_cases.length > 0 && (
            <section className="mt-12 border-t border-zinc-800 pt-10">
              <h2 className="text-lg font-semibold text-white mb-4">Who should pick which</h2>
              <ul className="space-y-3">
                {editorial.use_cases.map((uc, i) => {
                  const rec = toolBySlug.get(uc.recommendedSlug) as { name: string } | undefined
                  return (
                    <li key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                      <div className="text-sm font-medium text-white">{uc.persona}</div>
                      <div className="mt-1 text-xs text-emerald-400">
                        Pick: <span className="font-semibold">{rec?.name ?? uc.recommendedSlug}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">{uc.reasoning}</p>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Benchmarks */}
          {editorial.is_editorial && Array.isArray(editorial.benchmarks) && editorial.benchmarks.length > 0 && (
            <section className="mt-12 border-t border-zinc-800 pt-10">
              <h2 className="text-lg font-semibold text-white mb-4">Benchmarks</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 pr-4 font-medium text-zinc-400">Metric</th>
                      {toolSlugs.map((s: string) => (
                        <th key={s} className="text-left py-2 pr-4 font-medium text-white">
                          {(toolBySlug.get(s) as { name: string } | undefined)?.name ?? s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editorial.benchmarks.map((row, i) => (
                      <tr key={i} className="border-b border-zinc-900 last:border-0">
                        <td className="py-2 pr-4 text-zinc-400">{row.dimension}</td>
                        {toolSlugs.map((s: string) => {
                          const v = row.values?.[s]
                          return (
                            <td key={s} className="py-2 pr-4 text-zinc-200">
                              {v ? `${v.score}${v.unit ? ' ' + v.unit : ''}` : '—'}
                              {v?.source && (
                                <span className="block text-xs text-zinc-600">{v.source}</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* FAQ section for SEO / LLM citations */}
          <section className="mt-12 border-t border-zinc-800 pt-10">
            <h2 className="text-lg font-semibold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {displayedFaqs.map((f, i) => (
                <div key={i}>
                  <h3 className="text-sm font-medium text-white mb-1">{f.question}</h3>
                  <p className="text-sm text-zinc-400 whitespace-pre-line">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Phase 7H — Related comparisons + tool detail links.
              Per the audit, /compare/[slug] previously had only 1
              outbound internal link (breadcrumb). This block adds 8-10
              contextual links: 4-6 sibling compares + 2 tool detail
              pages + 2 alternatives pages. Total density jumps from
              ~1 to ~10 internal links per page — meaningful PageRank
              signal flow into the 587 compare set + back into the
              tool detail pages. */}
          <RelatedComparesRail compares={relatedCompares} heading={`More ${toolNames[0]} or ${toolNames[1]} comparisons`} />

          {/* Direct links to both tools' canonical pages — strong
              topical signal for Google to associate the compare page
              with the underlying tools. */}
          <section className="mt-8 border-t border-zinc-800 pt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Explore each tool further
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {tools.map((row) => {
                const t = row as { slug: string; name: string }
                return (
                <div key={t.slug} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <div className="text-base font-semibold text-white mb-2">{t.name}</div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/tools/${t.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-700 hover:bg-emerald-950/40 hover:text-emerald-300"
                    >
                      View {t.name} review
                    </Link>
                    <Link
                      href={`/tools/${t.slug}/alternatives`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-700 hover:bg-emerald-950/40 hover:text-emerald-300"
                    >
                      {t.name} alternatives
                    </Link>
                  </div>
                </div>
                )
              })}
            </div>
          </section>

          {/* Category hubs — internal links up the tree (topical authority) */}
          {compareCategories.length > 0 && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Browse these categories
              </h2>
              <div className="flex flex-wrap gap-2">
                {compareCategories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/categories/${c.slug}`}
                    className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-sm text-zinc-400 transition-colors hover:border-emerald-800/50 hover:text-emerald-300"
                  >
                    Best AI {c.name} tools
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Dept B — email capture on the #2 traffic surface (420 views/14d,
              previously zero capture). Compare readers are mid-research:
              the weekly brief is the natural "not deciding today" offramp. */}
          <div className="mt-10">
            <NewsletterForm
              source="compare_detail"
              sourceEntity={slug}
              variant="card"
              headline="Still deciding? Get the weekly AI tools brief"
              sub="One email a week — new tools, honest comparisons, no spam."
              ctaLabel="Subscribe free"
            />
          </div>

          {/* Last-reviewed note for editorial pages */}
          {editorial.is_editorial && editorial.last_reviewed_at && (
            <p className="mt-10 text-xs text-zinc-600">
              Last reviewed:{' '}
              {new Date(editorial.last_reviewed_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
