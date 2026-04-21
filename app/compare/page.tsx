import type { Metadata } from 'next'
import Link from 'next/link'
import { Scale, ArrowLeft, ArrowUpRight } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ComparisonTable } from '@/components/compare/comparison-table'
import {
  getToolsForComparison,
  getFeaturedEditorialComparisons,
} from '@/lib/data/comparisons'
import { getCategories } from '@/lib/data/categories'
import { ComparePageActions } from '@/components/compare/compare-page-actions'
import { CompareEmptyState } from '@/components/compare/compare-empty-state'

type PageProps = {
  searchParams: Promise<{ tools?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { tools: toolsParam } = await searchParams
  const slugs = (toolsParam ?? '').split(',').filter(Boolean)

  if (slugs.length < 2) {
    return {
      title: 'Compare AI Tools — Side-by-side editorial head-to-heads',
      description:
        'Compare any AI tool on RightAIChoice: features, pricing, ratings, and editorial verdicts on the comparisons people actually search for.',
      alternates: { canonical: 'https://rightaichoice.com/compare' },
    }
  }

  const tools = await getToolsForComparison(slugs)
  const names = tools.map((t: { name: string }) => t.name)

  return {
    title: `${names.join(' vs ')} — Compare AI Tools`,
    description: `Side-by-side comparison of ${names.join(', ')}. Compare features, pricing, ratings, and more.`,
    openGraph: {
      title: `${names.join(' vs ')} — RightAIChoice`,
      description: `Compare ${names.join(', ')} side by side.`,
    },
  }
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { tools: toolsParam } = await searchParams
  const slugs = (toolsParam ?? '').split(',').filter(Boolean).slice(0, 3)

  // ── Hub landing page (no ?tools= query) ──────────────────────
  if (slugs.length < 2) {
    const [editorial, categories] = await Promise.all([
      getFeaturedEditorialComparisons(12).catch(() => []),
      getCategories().catch(() => []),
    ])

    return (
      <>
        <Navbar />
        <main className="flex-1">
          {/* Build-your-own search hero */}
          <CompareEmptyState />

          {/* Editorial compares */}
          {editorial.length > 0 && (
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-zinc-800/50">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white">
                  In-depth editorial comparisons
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Deeply-researched head-to-heads with at-a-glance tables, benchmarks, and verdicts
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {editorial.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/compare/${c.slug}`}
                    className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-800/50 hover:bg-zinc-900/60 transition-all duration-200"
                  >
                    <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {c.toolNames.join(' vs ')}
                    </h3>
                    {c.verdict && (
                      <p className="mt-2 text-xs text-zinc-500 leading-relaxed line-clamp-3">
                        {c.verdict}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400 opacity-70 group-hover:opacity-100 transition-opacity">
                      Read the verdict <ArrowUpRight className="h-3 w-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Browse by category */}
          {categories.length > 0 && (
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-zinc-800/50">
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-white">
                  Browse tools by category
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Pick a category to see top tools and build your own comparison
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {categories.map((cat) => {
                  const c = cat as { id: string; slug: string; name: string; icon: string | null }
                  return (
                    <Link
                      key={c.id}
                      href={`/tools?category=${c.slug}`}
                      className="group flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all duration-200 text-center"
                    >
                      {c.icon && <span className="text-2xl mb-2">{c.icon}</span>}
                      <span className="text-xs font-medium text-zinc-300 group-hover:text-white transition-colors">
                        {c.name}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Closing CTA row */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-zinc-800/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Not sure which tool to pick?
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Describe your project and we&rsquo;ll recommend a full stack with costs and tradeoffs.
                </p>
              </div>
              <Link
                href="/plan"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                Get a custom plan
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  // ── Ad-hoc comparison (with ?tools= query) ──────────────────
  const tools = await getToolsForComparison(slugs)

  if (tools.length < 2) {
    return (
      <>
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
            <Scale className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Tools Not Found</h1>
            <p className="text-zinc-500 mb-6">
              Some of the tools you selected could not be found. Try selecting different tools.
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
                toolSlugs={slugs}
                toolIds={tools.map((t: { id: string }) => t.id)}
              />
            </div>
          </div>

          {/* Comparison Table */}
          <ComparisonTable tools={tools} />
        </div>
      </main>
      <Footer />
    </>
  )
}
