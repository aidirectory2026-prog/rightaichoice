// Revalidate homepage every 60 seconds (ISR)
export const revalidate = 60

// Phase 9 (2026-05-27): GSC URL Inspection on 2026-05-17 reported
// "Duplicate without user-selected canonical" — Google picked
// https://www.rightaichoice.com/ even though the site is served on
// the bare domain (www → bare 308 redirect is in place). Without an
// explicit canonical, ranking signals split between two URLs. Setting
// alternates.canonical = '/' resolves to https://rightaichoice.com/
// (metadataBase from app/layout.tsx) and tells Google which version
// to consolidate signals on.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

import Link from 'next/link'
import { PlanCTALink } from '@/components/cta/plan-cta-link'
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Layers,
  BarChart3,
  Zap,
  ChevronDown,
  Flame,
  Scale,
  LayoutGrid,
  ShieldCheck,
} from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { GoalInput } from '@/components/home/goal-input'
import { Reveal } from '@/components/ui/reveal'
import { StackAssembly } from '@/components/home/stack-assembly'
import { RecentlyViewed } from '@/components/home/recently-viewed'
import { SectionHeader } from '@/components/home/section-header'
import { getFeaturedTools } from '@/lib/data/tools'
import { getCategories } from '@/lib/data/categories'
import { getFeaturedEditorialComparisons } from '@/lib/data/comparisons'
import { categoryIconFor } from '@/lib/icons/category-icon'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'
import {
  decisionEngineServiceJsonLd,
  datasetJsonLd,
  faqPageJsonLd,
  itemListJsonLd,
  jsonLdScriptProps,
} from '@/lib/seo/json-ld'

// Phase 9 (2026-06-03) homepage SEO rebalance — see
// docs/marketing/Phase-9-Smart-SEO-Plan/16-homepage-seo-strategy.md.
// The homepage is the broad hub: it leads with demand vocabulary ("best AI
// tools / find the right AI tools") and routes link-equity to the qualified
// money pages — the 5 role STACK PILLARS and the 5 CORNERSTONE category guides —
// with exact-match anchors. (It previously linked to 4 stale example stacks and
// sent category links to /tools?category=, leaking equity away from the pages
// built to rank for "best ai [category] tools".)

// 5 role-based stack pillars (the real /stacks/* editorial pages).
const ROLE_STACKS = [
  {
    title: 'AI stack for early-stage SaaS',
    description: 'Engineering, product, support, and growth tooling for a lean SaaS team.',
    href: '/stacks/ai-stack-for-early-stage-saas',
  },
  {
    title: 'AI stack for solo developers',
    description: 'IDE, agents, backend, deploy, and design — ship products on your own.',
    href: '/stacks/ai-stack-for-solo-developers',
  },
  {
    title: 'AI stack for marketing teams',
    description: 'Research, copy, ad creative, SEO, and outreach across the funnel.',
    href: '/stacks/ai-stack-for-marketing-teams',
  },
  {
    title: 'AI stack for content creators',
    description: 'Research, writing, media, and distribution for consistent output.',
    href: '/stacks/ai-stack-for-content-creators',
  },
  {
    title: 'AI stack for product teams',
    description: 'Discovery, specs, design, testing, analytics, and customer feedback.',
    href: '/stacks/ai-stack-for-product-teams',
  },
] as const

// 5 cornerstone category guides — exact-match "best ai [category] tools" anchors
// pointing at the editorial /categories/{slug} pages (NOT /tools?category=).
const CORNERSTONES = [
  { title: 'Best AI coding tools', href: '/categories/code-development' },
  { title: 'Best AI image generators', href: '/categories/image-generation' },
  { title: 'Best AI writing tools', href: '/categories/writing-content' },
  { title: 'Best AI tools for research & study', href: '/categories/research-education' },
  { title: 'Best AI marketing & SEO tools', href: '/categories/marketing-seo' },
] as const

// Cornerstone slugs get the editorial /categories/{slug} page; every other
// category keeps the filtered /tools?category= browse view.
const CORNERSTONE_SLUGS = new Set([
  'code-development',
  'image-generation',
  'writing-content',
  'research-education',
  'marketing-seo',
])

// Homepage FAQ — answers the informational/decision queries (Tier 3). Plain-text
// `answer` feeds FAQPage schema (single source of truth, page-level); optional
// `links` render as internal hub links in the accordion only (not in schema).
const HOMEPAGE_FAQS: {
  question: string
  answer: string
  links?: { label: string; href: string }[]
}[] = [
  {
    question: 'How do I choose the right AI tools for my workflow?',
    answer:
      'Start from the goal, not the tool. Describe what you are trying to build or accomplish, and RightAIChoice breaks it into stages and recommends the best-rated AI tool for each step — with pricing, alternatives, and tradeoffs — instead of making you read 50 listicles.',
    links: [{ label: 'Plan your AI stack', href: '/plan' }],
  },
  {
    question: 'What are the best AI tools right now?',
    answer:
      'It depends on the job. We publish hand-tested, regularly-updated editorial guides for each major category so you can see the current picks and why they win.',
    links: [
      { label: 'Best AI coding tools', href: '/categories/code-development' },
      { label: 'Best AI image generators', href: '/categories/image-generation' },
      { label: 'Best AI writing tools', href: '/categories/writing-content' },
      { label: 'Best AI marketing & SEO tools', href: '/categories/marketing-seo' },
    ],
  },
  {
    question: 'What AI tools should I use for my startup or business?',
    answer:
      'We publish role-based AI stacks — opinionated, end-to-end toolkits for common teams and goals, each with a monthly-cost rollup and swap-out options.',
    links: [
      { label: 'AI stack for early-stage SaaS', href: '/stacks/ai-stack-for-early-stage-saas' },
      { label: 'AI stack for marketing teams', href: '/stacks/ai-stack-for-marketing-teams' },
      { label: 'AI stack for solo developers', href: '/stacks/ai-stack-for-solo-developers' },
      { label: 'Browse all AI stacks', href: '/stacks' },
    ],
  },
  {
    question: 'How much does an AI stack cost? Are AI tools free?',
    answer:
      'Many AI tools have a free tier, and a capable starter stack often runs $0–$50/month. Every recommendation on RightAIChoice shows current pricing and a total monthly cost for the stack, so there are no surprises.',
  },
  {
    question: 'What is an AI stack?',
    answer:
      'An AI stack is the set of AI tools you combine across the stages of a workflow — for example research, writing, design, and analytics — so each step is handled by the tool that does it best. Picking one tool-by-tool is slow; a stack gives you the whole workflow at once.',
  },
  {
    question: 'How does RightAIChoice work, and is it free?',
    answer:
      'RightAIChoice is an independent decision engine for AI tools. Tell us your goal and we match a recommended stack from 2,000+ tools, scored on real user sentiment, features, and cost. It is free to use.',
    links: [{ label: 'How we rank tools', href: '/methodology' }],
  },
]

export default async function HomePage() {
  const [featured, categories, editorialCompares] = await Promise.all([
    getFeaturedTools(6),
    getCategories(),
    getFeaturedEditorialComparisons(6).catch(() => [] as Awaited<ReturnType<typeof getFeaturedEditorialComparisons>>),
  ])

  return (
    <>
      {/* Phase 9: homepage structured data. Service + Dataset declare the
          decision-engine positioning + the catalog as a citable dataset.
          FAQPage powers the Tier-3 informational queries (AEO/PAA). ItemList
          marks the 5 role stacks as a curated, machine-readable list.
          Organization + WebSite + Person are emitted globally in the root
          layout. */}
      <script
        {...jsonLdScriptProps([
          decisionEngineServiceJsonLd(),
          datasetJsonLd(),
          faqPageJsonLd(HOMEPAGE_FAQS.map(({ question, answer }) => ({ question, answer }))),
          itemListJsonLd(
            'AI Stacks by Role',
            'Curated, end-to-end AI tool stacks for common roles and goals — each with picks, alternatives, and monthly cost.',
            '/',
            ROLE_STACKS.map((s) => ({ name: s.title, url: s.href })),
          ),
        ])}
      />
      <Navbar />

      <main className="flex-1">
        {/* ─── Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-zinc-950">
          <div className="hero-aurora-a" aria-hidden="true" />
          <div className="hero-aurora-b" aria-hidden="true" />
          <div className="hero-aurora-c" aria-hidden="true" />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
            <div className="hero-pill-glow inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/50 px-4 py-1.5 text-sm text-emerald-400 mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered decision engine
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              Find the <span className="hero-shimmer">best AI tools</span>
              <br />
              for what you&apos;re building.
            </h1>

            <p className="mt-5 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Describe your goal — we&apos;ll match the right AI stack from 2,000+ tools, compared on what actually matters: real user sentiment, side-by-side features, and total cost.
            </p>

            {/* Goal input → planner (textarea + chips inside the component) */}
            <div className="mt-10 max-w-2xl mx-auto">
              <GoalInput />
            </div>

            <div className="mt-12 max-w-xl mx-auto">
              <NewsletterForm
                source="home_hero"
                variant="card"
                headline="One AI tool every Friday"
                sub="A 60-second editorial pick from across 2,000+ tools we track. Independent, no funnel."
              />
            </div>

            <div className="mt-10 flex justify-center" aria-hidden="true">
              <ChevronDown className="hero-scroll-hint h-7 w-7 text-emerald-400" />
            </div>
          </div>
        </section>

        {/* ─── AEO intro / answer block ─────────────────────────────
             Crawlable definitional prose for the "how to choose AI tools" /
             "what is an AI stack" informational queries. Snippet-friendly
             lead sentence; links out to the planner + guides. */}
        <section className="border-t border-zinc-900/50 bg-zinc-950">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14">
            <h2 className="text-xl font-semibold text-white">How to choose the right AI tools</h2>
            <p className="mt-3 text-zinc-400 leading-relaxed">
              The fastest way to choose AI tools is to start from your goal, not the tool. Decide
              what you want to build, break the workflow into stages, then pick the best-rated tool
              for each stage on price, features, and real user sentiment. That set of tools — working
              together across your workflow — is your <strong className="text-zinc-200">AI stack</strong>.
              RightAIChoice builds it for you in seconds: describe your goal and get a complete,
              costed stack with alternatives for every step.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <PlanCTALink surface="homepage" pagePath="/" className="rai-arrow-nudge inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                Plan your AI stack <ArrowRight data-arrow className="h-3.5 w-3.5" />
              </PlanCTALink>
              <Link href="/stacks" className="text-zinc-400 hover:text-white">Browse AI stacks by role</Link>
              <Link href="/compare" className="text-zinc-400 hover:text-white">Compare AI tools</Link>
            </div>
          </div>
        </section>

        {/* ─── Recently viewed ─────────────────────────────────────
             Phase 6.4 (2026-05-11): server component reads the
             rac_recent cookie and renders a compact rail. Returns
             null when the cookie is empty. */}
        <RecentlyViewed />

        {/* ─── Stack Assembly Demo ─────────────────────────────── */}
        <section className="relative overflow-hidden border-t border-zinc-900/50 bg-zinc-950">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
            <StackAssembly />
          </div>
        </section>

        {/* ─── How It Works ────────────────────────────────────── */}
        <Reveal as="section" className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-center text-xl font-semibold text-white mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                step: '1',
                title: 'Describe your goal',
                desc: 'Tell us what you want to build or accomplish in plain language.',
              },
              {
                icon: Layers,
                step: '2',
                title: 'Get your stack',
                desc: 'AI breaks it into stages and recommends the best tool for each step.',
              },
              {
                icon: BarChart3,
                step: '3',
                title: 'Compare and choose',
                desc: 'See costs, alternatives, and tradeoffs — then decide with confidence.',
              },
            ].map(({ icon: Icon, step, title, desc }, i) => (
              <Reveal
                key={step}
                delayMs={i * 200}
                className="relative rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-800/50 bg-emerald-950/40">
                  <Icon className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="absolute top-4 right-4 text-xs font-mono text-zinc-600">{step}</span>
                <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* ─── AI stacks by role (pillars) ─────────────────────────
             Internal-link hub: keyword-rich anchors → the 5 role stack
             pillar pages (replaces the 4 stale example stacks). */}
        <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
          <div className="flex items-center justify-between mb-8">
            <SectionHeader
              icon={Layers}
              tint="emerald"
              title="AI stacks built for your role"
              subtitle="Opinionated, end-to-end AI toolkits — with picks, alternatives, and monthly cost"
              align="left"
            />
            <Link
              href="/stacks"
              className="rai-arrow-nudge hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Browse all AI stacks <ArrowRight data-arrow className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_STACKS.map((stack) => (
              <Link
                key={stack.href}
                href={stack.href}
                className="rai-lift rai-arrow-nudge group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-800/50 hover:bg-zinc-900/60"
              >
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {stack.title}
                </h3>
                <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed flex-1">
                  {stack.description}
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  See the stack <ArrowUpRight data-arrow className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </Reveal>

        {/* ─── Featured Tools ──────────────────────────────────── */}
        {featured.length > 0 && (
          <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
            <div className="flex items-center justify-between mb-8">
              <SectionHeader
                icon={Flame}
                tint="amber"
                title="Popular tools people are choosing"
                subtitle="Hand-picked AI tools worth checking out"
                align="left"
              />
              <Link
                href="/tools"
                className="rai-arrow-nudge hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all <ArrowRight data-arrow className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </Reveal>
        )}

        {/* ─── Editorial Head-to-Head Comparisons ──────────────── */}
        {editorialCompares.length > 0 && (
          <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
            <div className="mb-8">
              <SectionHeader
                icon={Scale}
                tint="violet"
                title="Popular AI tool comparisons"
                subtitle="Deeply-researched editorial verdicts on the head-to-heads people actually Google"
                align="left"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {editorialCompares.map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="rai-lift rai-arrow-nudge group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-800/50 hover:bg-zinc-900/60"
                >
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {c.toolNames.join(' vs ')}
                  </h3>
                  {c.verdict && (
                    <p className="mt-2 text-xs text-zinc-500 leading-relaxed line-clamp-3">
                      {c.verdict}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    Read the verdict <ArrowUpRight data-arrow className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        )}

        {/* ─── Categories ──────────────────────────────────────── */}
        {categories.length > 0 && (
          <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
            <SectionHeader
              icon={LayoutGrid}
              tint="sky"
              title="Browse by Category"
              subtitle="Find AI tools organized by what they do"
              className="mb-8"
            />

            {/* Cornerstone editorial guides — exact-match "best ai [category]"
                anchors → the editorial /categories/{slug} pages. */}
            <div className="mb-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Editor&apos;s guides</p>
              <div className="flex flex-wrap gap-2">
                {CORNERSTONES.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="rai-lift inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/40 px-4 py-1.5 text-sm text-zinc-300 hover:border-emerald-800/50 hover:text-emerald-300 transition-colors"
                  >
                    {c.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categories.map((cat) => {
                const Icon = categoryIconFor(cat.slug)
                // Cornerstone categories route to their editorial guide; the rest
                // keep the filtered tools view.
                const href = CORNERSTONE_SLUGS.has(cat.slug)
                  ? `/categories/${cat.slug}`
                  : `/tools?category=${cat.slug}`
                return (
                  <Link
                    key={cat.id}
                    href={href}
                    className="rai-lift group flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-emerald-800/40 hover:bg-zinc-900/60 text-center"
                  >
                    <span className="mb-2.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 group-hover:border-emerald-800/50 group-hover:bg-emerald-950/30 transition-colors">
                      <Icon
                        className="h-4 w-4 text-zinc-400 group-hover:text-emerald-300 transition-colors"
                        strokeWidth={1.75}
                      />
                    </span>
                    <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                )
              })}
            </div>
          </Reveal>
        )}

        {/* ─── FAQ ──────────────────────────────────────────────
             Server-rendered (crawlable) accordion targeting the
             informational/decision queries. FAQPage schema is emitted once
             at page level above — never inside this markup. */}
        <Reveal as="section" className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
          <h2 className="text-xl font-semibold text-white mb-8">Frequently asked questions</h2>
          <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/20">
            {HOMEPAGE_FAQS.map((faq) => (
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
        </Reveal>

        {/* ─── Trust strip (E-E-A-T) ───────────────────────────── */}
        <section className="border-t border-zinc-800/50 bg-zinc-950">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-6">
              <span className="inline-flex items-center gap-2 text-sm text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Independent &amp; editorial — no pay-for-placement
              </span>
              <span className="hidden text-zinc-700 sm:inline">·</span>
              <span className="text-sm text-zinc-400">2,000+ AI tools tracked &amp; updated weekly</span>
              <span className="hidden text-zinc-700 sm:inline">·</span>
              <Link href="/methodology" className="text-sm text-emerald-400 hover:text-emerald-300">
                How we rank tools →
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA — Plan Your Stack ────────────────────── */}
        <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
          <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-zinc-950 p-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-400">
              <Zap className="h-3 w-3" />
              Powered by AI
            </div>
            <h2 className="text-2xl font-bold text-white">
              Ready to find your AI tools?
            </h2>
            <p className="mt-3 text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Describe your goal and get a complete AI tool stack in seconds.
              Costs, tradeoffs, and alternatives — all in one place.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <PlanCTALink
                surface="homepage"
                pagePath="/"
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Plan Your Stack
              </PlanCTALink>
              <Link
                href="/tools"
                className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
              >
                Browse All Tools
              </Link>
            </div>
          </div>
        </Reveal>
      </main>

      <Footer />
    </>
  )
}
