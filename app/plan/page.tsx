import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ProjectPlanner } from '@/components/ai/project-planner'
import { createClient } from '@/lib/supabase/server'
import { TOOL_COUNT_DISPLAY } from '@/lib/copy/tool-count'
import { howToJsonLd, faqPageJsonLd, jsonLdScriptProps } from '@/lib/seo/json-ld'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'

// Phase 9 (2026-06-03) — advanced SEO for the AI stack builder. See
// docs/marketing/Phase-9-Smart-SEO-Plan/17-plan-page-seo.md.
// - Demand-led title/meta ("AI stack builder" / "plan your AI tool stack").
// - canonical '/plan' so the ?q=/?source=/?from= CTA-attribution params don't
//   spawn duplicate indexable URLs.
// - WebApplication + HowTo + FAQPage schema (Breadcrumb is emitted by the
//   <Breadcrumbs> component) for rich results + AI-answer eligibility.
// - Hub links to the 5 role stack pillars + AEO FAQ.
export const metadata: Metadata = {
  title: 'AI Stack Builder — Plan Your AI Tool Stack',
  description:
    'Describe your goal and get a complete AI tool stack in seconds — the right AI tool for every stage, with pricing, alternatives, and tradeoffs. Free AI stack builder.',
  alternates: { canonical: '/plan' },
  openGraph: {
    title: 'AI Stack Builder — Plan Your AI Tool Stack',
    description:
      'Describe your goal and get a complete AI tool stack in seconds — the right AI tool for every stage, with pricing, alternatives, and tradeoffs.',
    url: 'https://rightaichoice.com/plan',
    type: 'website',
  },
}

type PageProps = {
  searchParams: Promise<{ q?: string; source?: string; from?: string }>
}

type CtaSurface = 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage' | 'plan_page'
const VALID_SURFACES: ReadonlySet<CtaSurface> = new Set([
  'sticky_bar',
  'inline_card',
  'navbar',
  'homepage',
  'plan_page',
])

// 5 role stack pillars — "start from a ready-made stack" + internal-link hub.
const PLAN_PILLARS = [
  { title: 'AI stack for early-stage SaaS', href: '/stacks/ai-stack-for-early-stage-saas' },
  { title: 'AI stack for solo developers', href: '/stacks/ai-stack-for-solo-developers' },
  { title: 'AI stack for marketing teams', href: '/stacks/ai-stack-for-marketing-teams' },
  { title: 'AI stack for content creators', href: '/stacks/ai-stack-for-content-creators' },
  { title: 'AI stack for product teams', href: '/stacks/ai-stack-for-product-teams' },
] as const

const HOWTO_STEPS = [
  { name: 'Describe your goal', text: 'Tell us what you want to build, create, or automate — in plain language.' },
  { name: 'AI breaks it into stages', text: 'The planner decomposes your project into logical stages with clear objectives.' },
  { name: 'Get your tool stack', text: 'Each stage is matched with the best-rated AI tools, with pricing and the reasons behind each pick.' },
] as const

// FAQ — informational/decision queries around planning an AI stack. Plain-text
// answers feed FAQPage schema (page-level single source); `links` render only
// in the accordion and route equity to the pillars / methodology.
const PLAN_FAQS: { question: string; answer: string; links?: { label: string; href: string }[] }[] = [
  {
    question: 'How do I plan an AI stack?',
    answer:
      'Start from your goal, not the tool. Describe what you want to build and the planner breaks it into stages and recommends the best AI tool for each — with pricing and alternatives — so you get a complete, costed stack instead of guessing tool by tool.',
  },
  {
    question: 'What is an AI stack builder?',
    answer:
      'An AI stack builder turns a plain-language goal into a recommended set of AI tools across the stages of your workflow. RightAIChoice draws on 2,000+ tools scored on features, price, and real user sentiment to assemble the stack for you.',
  },
  {
    question: 'Is the AI stack planner free?',
    answer:
      'Yes — the planner is free to use. Every recommendation shows the tool’s current pricing (including free tiers) and the total monthly cost of the stack, so there are no surprises.',
  },
  {
    question: 'What AI tools should I use for my project?',
    answer:
      'It depends on your goal and stage. Describe it in the planner for a tailored stack, or start from a ready-made one built for your role.',
    links: [
      { label: 'AI stack for early-stage SaaS', href: '/stacks/ai-stack-for-early-stage-saas' },
      { label: 'AI stack for marketing teams', href: '/stacks/ai-stack-for-marketing-teams' },
      { label: 'Browse all AI stacks', href: '/stacks' },
    ],
  },
  {
    question: 'How does the planner choose tools?',
    answer:
      'It matches each stage to the best-rated tool on independent criteria — features, pricing, integrations, and aggregated user sentiment — never pay-for-placement.',
    links: [{ label: 'How we rank tools', href: '/methodology' }],
  },
  {
    question: 'Can I change the tools in my plan?',
    answer:
      'Yes. Every stage shows alternatives, so you can swap any pick for a tool you already use or prefer, and the total cost updates accordingly.',
  },
]

const WEBAPP_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'RightAIChoice AI Stack Builder',
  url: 'https://rightaichoice.com/plan',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Free AI stack builder: describe your goal and get a recommended AI tool stack for every stage of your workflow, with pricing, alternatives, and tradeoffs.',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  featureList: [
    'Goal-to-stack planning in plain language',
    'Per-stage AI tool recommendations',
    'Pricing and total monthly cost',
    'Alternatives for every pick',
    'Drawn from 2,000+ AI tools',
  ],
  provider: { '@type': 'Organization', name: 'RightAIChoice', url: 'https://rightaichoice.com' },
}

export default async function PlanPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const initialQuery = sp.q ?? ''

  // Phase 9 (2026-05-28) — CTA provenance carried in the URL by
  // PlanCTAButton (?source=sticky_bar&from=/tools/leena-ai). Used by the
  // ProjectPlanner to attribute the anon user's typed goal in plan_intents
  // back to the original CTA page rather than /plan itself.
  const rawSurface = sp.source as CtaSurface | undefined
  const sourceSurface: CtaSurface =
    rawSurface && VALID_SURFACES.has(rawSurface) ? rawSurface : 'plan_page'
  // Only accept absolute paths to avoid open-redirect-style mischief on the
  // attribution path.
  const fromRaw = typeof sp.from === 'string' ? sp.from.trim() : ''
  const originalPagePath =
    fromRaw && fromRaw.startsWith('/') && !fromRaw.startsWith('//')
      ? fromRaw.slice(0, 200)
      : undefined

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <>
      {/* WebApplication (the free tool) + HowTo (the 3-step process) + FAQPage
          (decision queries). BreadcrumbList is emitted by <Breadcrumbs>. */}
      <script
        {...jsonLdScriptProps([
          WEBAPP_JSONLD,
          howToJsonLd(
            'How to plan your AI stack',
            'Describe your goal and get a recommended AI tool stack for every stage in seconds.',
            '/plan',
            HOWTO_STEPS.map((s) => ({ name: s.name, text: s.text })),
          ),
          faqPageJsonLd(PLAN_FAQS.map(({ question, answer }) => ({ question, answer }))),
        ])}
      />
      <Navbar />
      <main className="flex-1">
        {/* Phase 6.3 (2026-05-11): breadcrumbs + BreadcrumbList JSON-LD. */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs
            crumbs={[
              { name: 'Home', url: '/' },
              { name: 'Plan My Stack', url: '/plan' },
            ]}
          />
        </div>

        {/* Hero section */}
        <div className="relative overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-zinc-950 to-zinc-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-teal-500/3 rounded-full blur-3xl" />

          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-16 pb-12">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/40 bg-emerald-950/30 px-4 py-1.5 text-sm text-emerald-400 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                AI-Powered Stack Builder
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                Build your AI stack
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                  from a single goal
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Describe what you want to build in plain language. Our AI stack builder analyzes {TOOL_COUNT_DISPLAY} tools,
                breaks your project into stages, and recommends the best AI tool for
                each step — with pricing, alternatives, and tradeoffs.
              </p>
            </div>

            <ProjectPlanner
              initialQuery={initialQuery}
              isLoggedIn={!!user}
              sourceSurface={sourceSurface}
              {...(originalPagePath ? { originalPagePath } : {})}
            />
          </div>
        </div>

        {/* How it works */}
        <div className="border-t border-zinc-800/50 bg-zinc-950">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-zinc-600 mb-10">
              How to plan your AI stack
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {HOWTO_STEPS.map((s, i) => (
                <div key={s.name} className="text-center">
                  <div
                    className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border ${
                      ['from-emerald-900/50 to-emerald-950 border-emerald-800/40', 'from-teal-900/50 to-teal-950 border-teal-800/40', 'from-cyan-900/50 to-cyan-950 border-cyan-800/40'][i]
                    } bg-gradient-to-br`}
                  >
                    <span className={`text-lg font-bold ${['text-emerald-400', 'text-teal-400', 'text-cyan-400'][i]}`}>{i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{s.name}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Start from a ready-made stack — hub links to the 5 role pillars */}
        <div className="border-t border-zinc-800/50 bg-zinc-950">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-semibold text-white">Or start from a ready-made AI stack</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Don’t want to type? Begin with an opinionated, end-to-end stack built for your role and tweak from there.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PLAN_PILLARS.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="rai-lift rai-arrow-nudge group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 px-5 py-4 hover:border-emerald-800/50 hover:bg-zinc-900/60"
                >
                  <span className="text-sm font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">{p.title}</span>
                  <ArrowUpRight data-arrow className="h-4 w-4 flex-shrink-0 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                </Link>
              ))}
              <Link
                href="/stacks"
                className="rai-lift group flex items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 px-5 py-4 text-sm font-medium text-zinc-400 hover:border-emerald-800/50 hover:text-emerald-400 transition-colors"
              >
                Browse all AI stacks →
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-t border-zinc-800/50">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-white">{TOOL_COUNT_DISPLAY}</p>
                <p className="text-xs text-zinc-500 mt-1">AI tools analyzed</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">15+</p>
                <p className="text-xs text-zinc-500 mt-1">Categories covered</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">~3s</p>
                <p className="text-xs text-zinc-500 mt-1">Avg. plan generation</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">Free</p>
                <p className="text-xs text-zinc-500 mt-1">Always free to use</p>
              </div>
            </div>

            {/* Related pages — keyword-rich internal links */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
              <span className="text-xs text-zinc-600">Explore more:</span>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { href: '/tools', label: 'Browse all AI tools' },
                  { href: '/compare', label: 'Compare AI tools' },
                  { href: '/stacks', label: 'AI stacks by role' },
                  { href: '/categories/code-development', label: 'Best AI coding tools' },
                  { href: '/best', label: 'Best-of guides' },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 min-h-[36px] text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ — server-rendered, crawlable. FAQPage schema emitted once above. */}
        <div className="border-t border-zinc-800/50 bg-zinc-950">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-xl font-semibold text-white mb-8">Frequently asked questions</h2>
            <div className="divide-y divide-zinc-800/70 rounded-xl border border-zinc-800 bg-zinc-900/20">
              {PLAN_FAQS.map((faq) => (
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
        </div>
      </main>
      <Footer />
    </>
  )
}
