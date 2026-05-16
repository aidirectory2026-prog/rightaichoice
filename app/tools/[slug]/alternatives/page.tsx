import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Scale } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { getToolBySlug, getAlternativeTools } from '@/lib/data/tools'
import { buildAlternativesPageMeta } from '@/lib/seo/metadata'

export const revalidate = 300

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) return { title: 'Tool Not Found' }
  return buildAlternativesPageMeta(tool.name, slug)
}

const PAGE_LIMIT = 30

export default async function AlternativesPage({ params }: PageProps) {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) notFound()

  const categories =
    tool.tool_categories
      ?.map((tc: { categories: { id: string; name: string; slug: string; icon: string | null } }) => tc.categories)
      .filter(Boolean) ?? []
  const tags =
    tool.tool_tags
      ?.map((tt: { tags: { id: string; name: string; slug: string } }) => tt.tags)
      .filter(Boolean) ?? []
  const categoryIds = categories.map((c: { id: string }) => c.id)
  const tagSlugs = tags.map((t: { slug: string }) => t.slug)

  const alternatives = await getAlternativeTools(tool.id, categoryIds, PAGE_LIMIT, {
    sourceSlug: tool.slug,
    sourceTagSlugs: tagSlugs,
    sourceTagline: tool.tagline ?? '',
    sourceName: tool.name,
  }).catch(() => [] as Awaited<ReturnType<typeof getAlternativeTools>>)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <Link
          href={`/tools/${tool.slug}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-400 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {tool.name}
        </Link>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Alternatives to {tool.name}
          </h1>
          <p className="text-zinc-400 leading-relaxed">
            {alternatives.length > 0 ? (
              <>
                {alternatives.length} {alternatives.length === 1 ? 'tool' : 'tools'} that compete with or replace {tool.name}. Ranked by direct product-type match — not generic category overlap.
              </>
            ) : (
              <>We don&apos;t have other tools curated as direct alternatives to {tool.name} yet.</>
            )}
          </p>
        </header>

        {alternatives.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {alternatives.map((alt) => {
              // Phase 7B.seo (2026-05-13): canonical alpha-sorted compare slug
              // matches the format Phase 7B's generator wrote into
              // tool_comparisons. If the editorial /compare/{slug} page
              // exists, this is a strong contextual link from a related
              // page — feeds PageRank to the compare set + helps Google
              // associate the two URLs as topically linked.
              const [a, b] = [tool.slug, alt.slug].sort()
              const compareSlug = `${a}-vs-${b}`
              return (
                <div key={alt.id} className="flex flex-col gap-2">
                  <ToolCard tool={alt} />
                  <Link
                    href={`/compare/${compareSlug}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-emerald-950/40 hover:border-emerald-800 hover:text-emerald-300 text-zinc-400 px-3 py-2 text-xs font-medium transition-colors"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    Compare {tool.name} vs {alt.name}
                  </Link>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 p-10 text-center">
            <p className="text-zinc-400 mb-4">
              We curate alternatives by direct product-type, not just shared category. {tool.name} is in a niche where we haven&apos;t yet seeded close competitors.
            </p>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              Browse all tools
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
