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
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
  howToJsonLd,
  itemListJsonLd,
  jsonLdScriptProps,
} from '@/lib/seo/json-ld'
import {
  StackPillarFaqs,
  StackPillarSection,
} from '@/components/stacks/stack-pillar-section'

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return STACKS.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const stack = getStackBySlug(slug)
  if (!stack) return {}

  const ogImage = `/api/og/stack?type=curated&slug=${slug}`

  // Phase 9 (2026-05-28): pillar stacks override the templated meta with
  // the hand-written editorial title/description so the SERP snippet
  // reflects the long-form pillar framing instead of the generic
  // "<title>". Non-pillar stacks unchanged.
  const title = stack.pillar?.metaTitle ?? stack.title
  const description = stack.pillar?.metaDescription ?? stack.description

  return {
    // pillar metaTitles already include "| RightAIChoice"; use absolute so the
    // root layout's "%s | RightAIChoice" template doesn't double it. Non-pillar
    // stacks fall through to the template as before.
    title: stack.pillar ? { absolute: stack.pillar.metaTitle } : stack.title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://rightaichoice.com/stacks/${slug}`,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    ...(stack.noindex && { robots: { index: false, follow: true } }),
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
    stack.stages.map((stage) => {
      const altSuffix = stage.alternatives.length > 0
        ? ` Alternatives: ${stage.alternatives.map((a) => a.name).join(', ')}.`
        : ''
      return {
        name: stage.name,
        text: `${stage.description} — Best pick: ${stage.bestPick.name} (${stage.bestPick.pricing}).${altSuffix}`,
        url: `/tools/${stage.bestPick.slug}`,
      }
    }),
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

  const jsonLd: Record<string, unknown>[] = [howTo, toolList, breadcrumbs]

  // Phase 9 (2026-05-28): pillar stacks emit Article + FAQPage JSON-LD
  // so the page is eligible for AI Overview citation and FAQ-rich-result
  // SERP treatment, on top of the existing HowTo + ItemList + Breadcrumb
  // schema the template already carries.
  if (stack.pillar) {
    jsonLd.push(
      articleJsonLd({
        headline: stack.pillar.metaTitle,
        description: stack.pillar.metaDescription,
        url: `/stacks/${slug}`,
        datePublished: stack.pillar.publishedISO,
        dateModified: stack.pillar.lastReviewedISO,
      }),
      faqPageJsonLd(stack.pillar.faqs),
    )
  }

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
              className="inline-flex items-center min-h-[44px] px-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
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

        {/* Phase 9 (2026-05-28): pillar stacks render the long-form
            editorial intro between the hero and the stages. Existing
            non-pillar stacks skip this section entirely. */}
        {stack.pillar && <StackPillarSection pillar={stack.pillar} />}

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

        {/* Phase 9 (2026-05-28): pillar FAQ section. Renders below the
            stages so users see the recommendations first, then the
            "questions Google might ask" set. Schema lives in jsonLd above. */}
        {stack.pillar && <StackPillarFaqs faqs={stack.pillar.faqs} />}

        {/* JSON-LD */}
        <script {...jsonLdScriptProps(jsonLd)} />
      </main>

      <Footer />
    </>
  )
}
