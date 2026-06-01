import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { SentimentReportPage } from '@/components/tools/sentiment-report-page'
import { getToolBySlug } from '@/lib/data/tools'

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

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <SentimentReportPage toolSlug={slug} toolName={tool.name} />
        </div>
      </main>
      <Footer />
    </>
  )
}
