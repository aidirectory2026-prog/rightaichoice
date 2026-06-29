import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Sparkles, ChevronDown } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { STACKS } from '@/lib/data/stacks'
import { StacksGrid } from '@/components/stacks/stacks-grid'
import { itemListJsonLd, faqPageJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'

// Phase 9 (2026-06-04) — advanced SEO for the AI stacks index (the pillar hub
// that the homepage, /plan, and navbar now point to). Added canonical, ItemList
// + FAQPage schema (Breadcrumb via <Breadcrumbs>), an AEO intro, a "by role"
// pillar row with keyword anchors, and an FAQ. See doc 18-stacks-index-seo.md.
export const metadata: Metadata = {
  title: 'AI Tool Stacks — Best AI Tools for Every Goal',
  description:
    'Pre-built AI tool stacks for popular goals and roles. Launch a SaaS, run a marketing team, develop solo, create content — each stack with picks, costs, alternatives, and tradeoffs.',
  alternates: { canonical: '/stacks' },
  openGraph: {
    title: 'AI Tool Stacks — Best AI Tools for Every Goal',
    description:
      'Pre-built AI tool stacks for popular goals and roles — each with picks, costs, alternatives, and tradeoffs.',
    url: 'https://rightaichoice.com/stacks',
    type: 'website',
  },
}

const STACK_FAQS: { question: string; answer: string; links?: { label: string; href: string }[] }[] = [
  {
    question: 'What is an AI stack?',
    answer:
      'An AI stack is the set of AI tools you combine across the stages of a workflow — for example research, design, build, and analytics — so each step is handled by the tool that does it best. A good stack covers the whole workflow rather than a single task.',
  },
  {
    question: 'How do I choose the right AI stack?',
    answer:
      'Start from your goal or role, then match the best-rated tool to each stage on price, features, and real-world signals. Use a ready-made stack below as a baseline, or describe your goal in the planner for a tailored one.',
    links: [{ label: 'Plan a custom AI stack', href: '/plan' }],
  },
  {
    question: 'Are these AI stacks free?',
    answer:
      'Most stacks have a free path using free tiers, plus a paid path for more capability. Each stack lists both the free and paid monthly cost, and every tool shows its current pricing.',
  },
  {
    question: 'Can I customize a stack or swap tools?',
    answer:
      'Yes. Every stage lists alternatives, so you can swap any pick for a tool you already use or prefer. The planner also builds a stack around tools you already have.',
  },
  {
    question: 'What if my goal isn’t listed here?',
    answer:
      'Describe it in the AI stack builder and we’ll assemble a complete, costed stack for your specific goal in seconds.',
    links: [{ label: 'Build my AI stack', href: '/plan' }],
  },
]

export default function StacksIndexPage() {
  const pillars = STACKS.filter((s) => s.pillar)
  const others = STACKS.filter((s) => !s.pillar)

  return (
    <>
      <script
        {...jsonLdScriptProps([
          itemListJsonLd(
            'AI Tool Stacks',
            'Curated, end-to-end AI tool stacks for popular goals and roles — each with picks, alternatives, and monthly cost.',
            '/stacks',
            STACKS.map((s) => ({ name: s.goal, url: `/stacks/${s.slug}` })),
          ),
          faqPageJsonLd(STACK_FAQS.map(({ question, answer }) => ({ question, answer }))),
        ])}
      />
      <Navbar />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', url: '/' },
              { name: 'AI Stacks', url: '/stacks' },
            ]}
          />
        </div>

        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-14 pb-10 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Best AI Stack for <span className="text-emerald-400">Every Goal</span>
            </h1>
            <p className="mt-4 text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              An AI stack is the set of tools you combine across the stages of a workflow.
              Pick a ready-made stack for your goal or role below — each with the best-rated
              tool per stage, monthly cost, and alternatives — or build a custom one in seconds.
            </p>
          </div>
        </section>

        {/* Stacks by role — the editorial pillar pages, keyword anchors */}
        {pillars.length > 0 && (
          <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-4">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">AI stacks by role</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pillars.map((stack) => (
                <Link
                  key={stack.slug}
                  href={`/stacks/${stack.slug}`}
                  className="rai-lift rai-arrow-nudge group flex items-center justify-between rounded-xl border border-emerald-900/40 bg-emerald-950/10 px-5 py-4 hover:border-emerald-700/60 hover:bg-emerald-950/20"
                >
                  <span className="text-sm font-medium text-zinc-100 group-hover:text-emerald-300 transition-colors">{stack.goal}</span>
                  <ArrowUpRight data-arrow className="h-4 w-4 flex-shrink-0 text-emerald-500/70" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-16 pt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">All AI stacks by goal</h2>
          <StacksGrid
            stacks={others.map((stack) => ({
              slug: stack.slug,
              goal: stack.goal,
              description: stack.description,
              stages: stack.stages.length,
              paidPath: stack.summary.paidPath,
              freePath: stack.summary.freePath,
              skillLevel: stack.summary.skillLevel,
            }))}
          />

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-sm text-zinc-500 mb-4">Don&apos;t see your goal? Build a custom stack.</p>
            <Link
              href="/plan"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Plan Your Stack
            </Link>
          </div>
        </section>

        {/* FAQ — server-rendered, crawlable. FAQPage schema emitted once above. */}
        <section className="border-t border-zinc-800/50 bg-zinc-950">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-xl font-semibold text-white mb-8">Frequently asked questions</h2>
            <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/20">
              {STACK_FAQS.map((faq) => (
                <details key={faq.question} className="group px-5">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 py-4 text-sm font-medium text-zinc-200 marker:content-['']">
                    {faq.question}
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-5 text-sm text-zinc-400 leading-relaxed">
                    <p>{faq.answer}</p>
                    {faq.links && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                        {faq.links.map((l) => (
                          <Link key={l.href} href={l.href} className="text-emerald-400 hover:text-emerald-300">
                            {l.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
