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
  getAllComparisonSlugs,
} from '@/lib/data/comparisons'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const comparisons = await getAllComparisonSlugs()
  return comparisons.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const comparison = await getComparisonBySlug(slug)
  if (!comparison) return { title: 'Comparison Not Found' }

  const tools = await getToolsForComparisonByIds(comparison.tool_ids)
  const names = tools.map((t: { name: string }) => t.name)
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

  const tools = await getToolsForComparisonByIds(comparison.tool_ids)

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

  const toolNames = tools.map((t: { name: string }) => t.name)
  const toolSlugs = tools.map((t: { slug: string }) => t.slug)

  return (
    <>
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
                toolIds={tools.map((t: { id: string }) => t.id)}
                savedSlug={slug}
              />
            </div>
          </div>

          {/* Comparison Table */}
          <ComparisonTable tools={tools} />

          {/* FAQ section for SEO / LLM citations */}
          <section className="mt-12 border-t border-zinc-800 pt-10">
            <h2 className="text-lg font-semibold text-white mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-white mb-1">
                  Which is better, {toolNames[0]} or {toolNames[1]}?
                </h3>
                <p className="text-sm text-zinc-400">
                  The best choice between {toolNames[0]} and {toolNames[1]} depends on your specific use case. Use the comparison table above to evaluate features, pricing, and ratings side by side. {toolNames[0]} has a rating of {(tools[0] as { avg_rating: number }).avg_rating?.toFixed(1) ?? 'N/A'}/5 and {toolNames[1]} has a rating of {(tools[1] as { avg_rating: number }).avg_rating?.toFixed(1) ?? 'N/A'}/5 based on real user reviews.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">
                  What are the main differences between {toolNames[0]} and {toolNames[1]}?
                </h3>
                <p className="text-sm text-zinc-400">
                  The key differences include pricing model, feature set, platform support, and skill level requirements. Review the full comparison table above for a detailed breakdown of every dimension.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white mb-1">
                  Is there a free version of {toolNames[0]} or {toolNames[1]}?
                </h3>
                <p className="text-sm text-zinc-400">
                  Check the pricing section in the comparison table above for the latest pricing details on both tools, including free tiers, trial options, and paid plans.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
