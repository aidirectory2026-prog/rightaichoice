import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ReportClient } from '@/components/report/report-client'
import { getToolBySlug } from '@/lib/data/tools'
import { buildReportPageMeta } from '@/lib/seo/metadata'

export const revalidate = 300

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) return { title: 'Tool Not Found' }

  return buildReportPageMeta(tool.name, slug)
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params
  const tool = await getToolBySlug(slug)
  if (!tool) notFound()

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <ReportClient slug={slug} toolName={tool.name} toolTagline={tool.tagline} />
        </div>
      </main>
      <Footer />
    </>
  )
}
