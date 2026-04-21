import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Scale, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ComparisonTable } from '@/components/compare/comparison-table'
import { ComparePageActions } from '@/components/compare/compare-page-actions'
import {
  getComparisonBySlug,
  getToolsForComparisonByIds,
} from '@/lib/data/comparisons'
import { faqPageJsonLd, breadcrumbJsonLd, jsonLdScriptProps, articleJsonLd } from '@/lib/seo/json-ld'

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
  const title = `${names.join(' vs ')} — AI Tool Comparison`
  const description = `In-depth side-by-side comparison of ${names.join(' and ')}. Compare features, pricing, ratings, and more to make the right AI tool choice.`

  return {
    title,
    description,
    openGraph: {
      title: `${names.join(' vs ')} — RightAIChoice`,
      description,
      url: `https://rightaichoice.com/compare/${slug}`,
    },
    alternates: {
      canonical: `https://rightaichoice.com/compare/${slug}`,
    },
  }
}

export default async function ComparisonSlugPage({ params }: Props) {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)

  if (!comparison) notFound()

  const tools = await getToolsForComparisonByIds(comparison.tool_ids as string[])

  if (tools.length < 2) {
    return (
      <>
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
            <Scale className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Tools Not Found</h1>
            <p className="text-zinc-500 mb-6">
              One or more tools in this comparison no longer exist.
            </p>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Browse Tools
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const toolNames = tools.map((t) => (t as { name: string }).name)
  const toolSlugs = tools.map((t) => (t as { slug: string }).slug)
  const editorial = comparison as EditorialComparison

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

  const jsonLdBlocks: Record<string, unknown>[] = [faq, breadcrumbs]
  if (editorial.is_editorial) {
    jsonLdBlocks.push(
      articleJsonLd({
        headline: `${toolNames.join(' vs ')} — AI Tool Comparison`,
        description: `In-depth side-by-side comparison of ${toolNames.join(' and ')}.`,
        url: `/compare/${slug}`,
        datePublished: editorial.published_at ?? new Date().toISOString(),
        dateModified: editorial.last_reviewed_at ?? editorial.published_at ?? new Date().toISOString(),
      }),
    )
  }

  const toolBySlug = new Map(
    tools.map((t) => [(t as { slug: string }).slug, t as { slug: string; name: string }]),
  )

  return (
    <>
      <script {...jsonLdScriptProps(jsonLdBlocks)} />
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Tools
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {toolNames.join(' vs ')}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Side-by-side comparison of features, pricing, and ratings
                </p>
              </div>
              <ComparePageActions
                toolSlugs={toolSlugs}
                toolIds={tools.map((t) => (t as { id: string }).id)}
                savedSlug={slug}
              />
            </div>
          </div>

          {/* TL;DR — hero snippet bait, editorial pages only */}
          {editorial.is_editorial && Array.isArray(editorial.tldr) && editorial.tldr.length > 0 && (
            <section className="mb-10 rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-5">
              <h2 className="text-sm font-semibold text-emerald-300 mb-3">TL;DR</h2>
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
            </section>
          )}

          {/* Comparison Table */}
          <ComparisonTable tools={tools as unknown as Parameters<typeof ComparisonTable>[0]['tools']} />

          {/* Feature analysis — editorial long-form */}
          {editorial.is_editorial && editorial.feature_analysis && (
            <section className="mt-12 border-t border-zinc-800 pt-10">
              <h2 className="text-lg font-semibold text-white mb-4">Feature-by-feature</h2>
              <div className="prose prose-invert prose-zinc prose-sm max-w-none whitespace-pre-line">
                {editorial.feature_analysis}
              </div>
            </section>
          )}

          {/* Pricing analysis */}
          {editorial.is_editorial && editorial.pricing_analysis && (
            <section className="mt-12 border-t border-zinc-800 pt-10">
              <h2 className="text-lg font-semibold text-white mb-4">Pricing compared</h2>
              <div className="prose prose-invert prose-zinc prose-sm max-w-none whitespace-pre-line">
                {editorial.pricing_analysis}
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
                                <span className="block text-[10px] text-zinc-600">{v.source}</span>
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
