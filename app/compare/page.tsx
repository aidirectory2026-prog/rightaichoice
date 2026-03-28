import type { Metadata } from 'next'
import Link from 'next/link'
import { Scale, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ComparisonTable } from '@/components/compare/comparison-table'
import { getToolsForComparison } from '@/lib/data/comparisons'
import { ComparePageActions } from '@/components/compare/compare-page-actions'

type PageProps = {
  searchParams: Promise<{ tools?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { tools: toolsParam } = await searchParams
  const slugs = (toolsParam ?? '').split(',').filter(Boolean)

  if (slugs.length < 2) {
    return { title: 'Compare AI Tools' }
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

  if (slugs.length < 2) {
    return (
      <>
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
            <Scale className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Compare AI Tools</h1>
            <p className="text-zinc-500 mb-6">
              Select 2 or 3 tools from the{' '}
              <Link href="/tools" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                directory
              </Link>{' '}
              to compare them side by side.
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
