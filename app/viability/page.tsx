import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert, ShieldX, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ViabilityBadge } from '@/components/tools/viability-badge'
import { ToolLogo } from '@/components/tools/tool-logo'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbJsonLd } from '@/lib/seo/json-ld'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'AI Tool Viability Scores — Is Your AI Tool Safe to Use?',
  description:
    'Every AI tool rated 0–100 for survival probability. See which tools are safe bets and which are at risk of shutting down. Updated weekly.',
  openGraph: {
    title: 'AI Tool Viability Scores — RightAIChoice',
    description: 'Every AI tool rated 0–100 for survival probability.',
    url: 'https://rightaichoice.com/viability',
  },
  alternates: { canonical: 'https://rightaichoice.com/viability' },
}

async function getViabilityLeaderboard() {
  const supabase = await createClient()

  const [safest, riskiest] = await Promise.all([
    supabase
      .from('tools')
      .select('id, name, slug, logo_url, website_url, viability_score, pricing_type')
      .eq('is_published', true)
      .not('viability_score', 'is', null)
      .order('viability_score', { ascending: false })
      .limit(10),
    supabase
      .from('tools')
      .select('id, name, slug, logo_url, website_url, viability_score, pricing_type')
      .eq('is_published', true)
      .not('viability_score', 'is', null)
      .order('viability_score', { ascending: true })
      .limit(10),
  ])

  return {
    safest: safest.data ?? [],
    riskiest: riskiest.data ?? [],
  }
}

export default async function ViabilityPage() {
  const { safest, riskiest } = await getViabilityLeaderboard()

  const signals = [
    { name: 'Wrapper Dependency', weight: '30%', desc: 'Is the tool built entirely on top of another AI API with no proprietary technology? Pure wrappers face the highest shutdown risk when the underlying API changes pricing or adds the same feature natively.' },
    { name: 'GitHub Activity', weight: '20%', desc: 'For open-source tools: commit frequency, contributor count, and star trajectory over the past 90 days. Active development signals a healthy, invested team.' },
    { name: 'Funding Runway', weight: '20%', desc: 'Estimated financial runway based on last funding round, total raised, and revenue indicators. Tools with no funding and no paid tier are the most fragile.' },
    { name: 'Hyperscaler Overlap', weight: '15%', desc: 'Is Google, Microsoft, or OpenAI building the same feature natively? When a hyperscaler enters your space, the window to differentiate shrinks fast.' },
    { name: 'Category Mortality', weight: '10%', desc: 'Historical death rate of tools in the same category. Some categories (AI writing wrappers) have 40%+ mortality. Others (dev tools with deep integrations) are much safer.' },
    { name: 'Website Health', weight: '5%', desc: 'Is the website consistently accessible? Is the pricing page still active? Basic signals that the business is still operating.' },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is an AI tool viability score?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'A viability score is a 0–100 rating predicting the likelihood an AI tool will still be operational in 12 months. It combines 6 signals: wrapper dependency (30%), GitHub activity (20%), funding runway (20%), hyperscaler overlap (15%), category mortality (10%), and website health (5%).',
        },
      },
      {
        '@type': 'Question',
        name: 'Why do AI tools shut down?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Over 1,500 AI tools have shut down since 2023. The main causes are: running out of funding (no revenue model), being a thin wrapper over ChatGPT/Claude that gets undercut by the platform itself, hyperscalers (Google, Microsoft) adding the feature natively, and category oversaturation where 50+ tools compete for the same niche.',
        },
      },
      {
        '@type': 'Question',
        name: 'How often are viability scores updated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Viability scores are recalculated weekly. Each run processes tools in batches, prioritizing those with the oldest scores first. Major events (funding rounds, acquisitions, shutdowns) trigger immediate recalculation.',
        },
      },
    ],
  }

  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([
          jsonLd,
          breadcrumbJsonLd([
            { name: 'Home', url: 'https://rightaichoice.com' },
            { name: 'Viability Scores', url: 'https://rightaichoice.com/viability' },
          ]),
        ]) }}
      />

      <main className="flex-1">
        {/* Hero */}
        <div className="border-b border-zinc-800 bg-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
            <h1 className="text-3xl font-bold text-white">
              AI Tool Viability Scores
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-400 leading-relaxed">
              Over 1,500 AI tools have shut down since 2023. Before you build your workflow around a tool,
              check whether it will still be here in 12 months. Every tool on RightAIChoice is scored 0–100
              for survival probability.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/viability/safe-bets"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-800 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                Safe Bets (85+)
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/viability/at-risk"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600/20 border border-red-800 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-600/30 transition-colors"
              >
                <ShieldX className="h-4 w-4" />
                At Risk (&lt;40)
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          {/* Methodology */}
          <section className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-2">How We Score</h2>
            <p className="text-sm text-zinc-500 mb-6 max-w-2xl">
              Each tool is evaluated across 6 signals. The weighted sum produces a single 0–100 score.
              Higher = more likely to survive the next 12 months.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {signals.map((s) => (
                <div
                  key={s.name}
                  className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">{s.name}</h3>
                    <span className="text-xs font-mono text-emerald-400">{s.weight}</span>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Score scale legend */}
          <section className="mb-16">
            <h2 className="text-xl font-semibold text-white mb-6">Score Scale</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/10 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">70–100 — Safe</span>
                </div>
                <p className="text-xs text-zinc-500">Well-funded, active development, proprietary tech, no major platform risk. Build confidently.</p>
              </div>
              <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/10 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="h-5 w-5 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-400">40–69 — Monitor</span>
                </div>
                <p className="text-xs text-zinc-500">Some risk factors present. Use it, but have a backup plan. Check back monthly.</p>
              </div>
              <div className="rounded-xl border border-red-800/40 bg-red-950/10 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldX className="h-5 w-5 text-red-400" />
                  <span className="text-sm font-semibold text-red-400">0–39 — At Risk</span>
                </div>
                <p className="text-xs text-zinc-500">Multiple high-risk signals. Consider alternatives before investing time or money.</p>
              </div>
            </div>
          </section>

          {/* Leaderboard */}
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Safest */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-white">Safest AI Tools</h2>
              </div>
              {safest.length === 0 ? (
                <p className="text-sm text-zinc-500">Scores are being calculated. Check back soon.</p>
              ) : (
                <div className="space-y-2">
                  {safest.map((tool, i) => (
                    <Link
                      key={tool.id}
                      href={`/tools/${tool.slug}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-700 transition-colors"
                    >
                      <span className="text-xs font-mono text-zinc-600 w-5">
                        {i + 1}.
                      </span>
                      <ToolLogo
                        tool={tool}
                        size={32}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 overflow-hidden"
                        fallbackClassName="text-xs font-bold text-zinc-500"
                      />
                      <span className="flex-1 text-sm font-medium text-white truncate">
                        {tool.name}
                      </span>
                      <ViabilityBadge score={tool.viability_score} size="sm" />
                    </Link>
                  ))}
                </div>
              )}
              {safest.length > 0 && (
                <Link
                  href="/viability/safe-bets"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  View all safe bets <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </section>

            {/* Riskiest */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <TrendingDown className="h-5 w-5 text-red-400" />
                <h2 className="text-lg font-semibold text-white">Most At-Risk AI Tools</h2>
              </div>
              {riskiest.length === 0 ? (
                <p className="text-sm text-zinc-500">Scores are being calculated. Check back soon.</p>
              ) : (
                <div className="space-y-2">
                  {riskiest.map((tool, i) => (
                    <Link
                      key={tool.id}
                      href={`/tools/${tool.slug}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 hover:border-zinc-700 transition-colors"
                    >
                      <span className="text-xs font-mono text-zinc-600 w-5">
                        {i + 1}.
                      </span>
                      <ToolLogo
                        tool={tool}
                        size={32}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 overflow-hidden"
                        fallbackClassName="text-xs font-bold text-zinc-500"
                      />
                      <span className="flex-1 text-sm font-medium text-white truncate">
                        {tool.name}
                      </span>
                      <ViabilityBadge score={tool.viability_score} size="sm" />
                    </Link>
                  ))}
                </div>
              )}
              {riskiest.length > 0 && (
                <Link
                  href="/viability/at-risk"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  View all at-risk tools <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </section>
          </div>

          {/* CTA */}
          <div className="mt-16 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Build your AI stack with confidence
            </h2>
            <p className="text-sm text-zinc-500 mb-5 max-w-lg mx-auto">
              The Stack Planner recommends tools with strong viability scores so your workflow
              doesn't break when a tool disappears.
            </p>
            <Link
              href="/plan"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Plan My Stack
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
