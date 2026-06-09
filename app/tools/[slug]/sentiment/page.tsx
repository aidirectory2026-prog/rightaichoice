import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { SentimentReportPage } from '@/components/tools/sentiment-report-page'
import { SentimentRelated } from '@/components/tools/sentiment-related'
import { getToolBySlug, getAlternativeTools } from '@/lib/data/tools'
import { getEditorialComparisonsForTool } from '@/lib/data/comparisons'
import { getCachedSentiment } from '@/lib/data/sentiment'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) return { title: 'Tool Not Found' }
  return {
    title: `${tool.name} — Live Market Sentiment | RightAIChoice`,
    description: `What people really think about ${tool.name}: a real-time sweep of social media, forums, reviews, and community discussions, synthesized into an honest verdict.`,
    robots: { index: false }, // gated, dynamic per-user — not for indexing
  }
}

export default async function ToolSentimentPage({ params }: PageProps) {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories = (tool as any).tool_categories?.map((tc: { categories: { id: string; name: string; slug: string } }) => tc.categories).filter(Boolean) ?? []
  const categoryIds = categories.map((c: { id: string }) => c.id)

  const [alternatives, compares, cached] = await Promise.all([
    categoryIds.length
      ? getAlternativeTools(tool.id, categoryIds, 8).catch(() => [] as Awaited<ReturnType<typeof getAlternativeTools>>)
      : Promise.resolve([] as Awaited<ReturnType<typeof getAlternativeTools>>),
    getEditorialComparisonsForTool(tool.id).catch(() => [] as Awaited<ReturnType<typeof getEditorialComparisonsForTool>>),
    getCachedSentiment(tool.id).catch(() => null),
  ])

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <SentimentReportPage toolSlug={slug} toolName={tool.name} cached={cached} />
          <SentimentRelated
            toolName={tool.name}
            toolSlug={slug}
            alternatives={alternatives.map((a) => ({ slug: a.slug, name: a.name, tagline: a.tagline, logo_url: a.logo_url }))}
            compares={compares.map((c) => ({ slug: c.slug }))}
            category={categories[0] ? { name: categories[0].name, slug: categories[0].slug } : null}
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
