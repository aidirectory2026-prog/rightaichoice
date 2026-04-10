// Revalidate every hour (ISR)
export const revalidate = 3600

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { StackStageCard } from '@/components/stacks/stack-stage-card'
import { StackSummary } from '@/components/stacks/stack-summary'
import { SaveStackButton } from '@/components/stacks/save-stack-button'
import { ExportStack } from '@/components/stacks/export-stack'
import { STACKS, getStackBySlug } from '@/lib/data/stacks'
import { createClient } from '@/lib/supabase/server'
import { howToJsonLd, itemListJsonLd, breadcrumbJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return STACKS.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const stack = getStackBySlug(slug)
  if (!stack) return {}

  const ogImage = `/api/og/stack?type=curated&slug=${slug}`

  return {
    title: stack.title,
    description: stack.description,
    openGraph: {
      title: stack.title,
      description: stack.description,
      type: 'article',
      url: `https://rightaichoice.com/stacks/${slug}`,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: stack.title,
      description: stack.description,
      images: [ogImage],
    },
  }
}

export default async function StackPage({ params }: Props) {
  const { slug } = await params
  const stack = getStackBySlug(slug)
  if (!stack) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // JSON-LD structured data
  const howTo = howToJsonLd(
    stack.title,
    stack.description,
    `/stacks/${slug}`,
    stack.stages.map((stage) => ({
      name: stage.name,
      text: `${stage.description} — Best pick: ${stage.bestPick.name} (${stage.bestPick.pricing}). Alternatives: ${stage.alternatives.map((a) => a.name).join(', ')}.`,
      url: `/tools/${stage.bestPick.slug}`,
    })),
  )

  const allTools = stack.stages.flatMap((s) => [
    s.bestPick,
    ...s.alternatives,
  ])
  const toolList = itemListJsonLd(
    `Tools in ${stack.title}`,
    `All AI tools recommended for the ${stack.goal} stack`,
    `/stacks/${slug}`,
    allTools.map((t) => ({ name: t.name, url: `/tools/${t.slug}` })),
  )

  const breadcrumbs = breadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'AI Stacks', url: '/stacks' },
    { name: stack.title, url: `/stacks/${slug}` },
  ])

  const jsonLd = [howTo, toolList, breadcrumbs]

  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-10 text-center">
            <Link
              href="/stacks"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              &larr; All Stacks
            </Link>
            <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              {stack.title}
            </h1>
            <p className="mt-3 text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              {stack.description}
            </p>
            <p className="mt-3 text-xs text-zinc-600">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <SaveStackButton
                title={stack.title}
                goal={stack.goal}
                description={stack.description}
                stages={stack.stages}
                summary={stack.summary as Record<string, unknown>}
                source="curated"
                sourceSlug={slug}
                isLoggedIn={!!user}
              />
              <ExportStack
                title={stack.title}
                goal={stack.goal}
                stages={stack.stages}
                summary={stack.summary}
                shareUrl={`/stacks/${slug}`}
              />
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            {/* Stages */}
            <div className="space-y-4">
              {stack.stages.map((stage, i) => (
                <StackStageCard key={stage.name} stage={stage} index={i} />
              ))}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="lg:sticky lg:top-20">
                <StackSummary stack={stack} />

              </div>
            </div>
          </div>
        </section>

        {/* JSON-LD */}
        <script {...jsonLdScriptProps(jsonLd)} />
      </main>

      <Footer />
    </>
  )
}
