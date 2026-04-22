// Revalidate homepage every 60 seconds (ISR)
export const revalidate = 60

import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Sparkles, Layers, BarChart3, Zap, ChevronDown } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToolCard } from '@/components/tools/tool-card'
import { GoalInput } from '@/components/home/goal-input'
import { Reveal } from '@/components/ui/reveal'
import { getFeaturedTools } from '@/lib/data/tools'
import { getCategories } from '@/lib/data/categories'
import { getFeaturedEditorialComparisons } from '@/lib/data/comparisons'

const EXAMPLE_STACKS = [
  {
    title: 'Launch a SaaS MVP',
    description: 'Design, build, and ship a product without a full dev team',
    href: '/stacks/launch-saas-mvp',
    tools: '6 stages',
    cost: 'From $0/mo',
  },
  {
    title: 'Start a YouTube Channel',
    description: 'Script, record, edit, thumbnail, and grow — all with AI',
    href: '/stacks/youtube-channel',
    tools: '5 stages',
    cost: 'From $0/mo',
  },
  {
    title: 'Run a Solo Marketing Agency',
    description: 'Content, ads, SEO, email, and reporting for multiple clients',
    href: '/stacks/solo-marketing-agency',
    tools: '7 stages',
    cost: 'From $29/mo',
  },
  {
    title: 'Automate Customer Support',
    description: 'Chatbots, ticketing, knowledge base, and escalation flows',
    href: '/stacks/automate-customer-support',
    tools: '5 stages',
    cost: 'From $0/mo',
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
      <Navbar />

      <main className="flex-1">
        {/* ─── Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950" />
          <div className="hero-aurora-a" aria-hidden="true" />
          <div className="hero-aurora-b" aria-hidden="true" />

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/50 px-4 py-1.5 text-sm text-emerald-400 mb-8">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered decision engine
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              <span className="hero-shimmer">Build anything</span> with AI.
              <br />
              We&apos;ll give you the exact stack.
            </h1>

            <p className="mt-5 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Tell us your goal. Get a complete tool stack with costs, tradeoffs, and alternatives for every stage.
            </p>

            {/* Goal input → planner */}
            <div className="mt-10 max-w-2xl mx-auto">
              <GoalInput />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-600">
              <span>Try:</span>
              {['Build a SaaS product', 'Start a YouTube channel', 'Automate lead generation', 'Launch a podcast'].map(
                (term) => (
                  <Link
                    key={term}
                    href={`/plan?q=${encodeURIComponent(term)}`}
                    className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-500 hover:border-emerald-800/50 hover:text-emerald-400 transition-colors"
                  >
                    {term}
                  </Link>
                )
              )}
            </div>

            <div className="mt-10 flex justify-center" aria-hidden="true">
              <ChevronDown className="hero-scroll-hint h-5 w-5 text-zinc-600" />
            </div>
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
                delayMs={i * 90}
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

        {/* ─── Example Stacks ──────────────────────────────────── */}
        <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
          <div className="text-center mb-10">
            <h2 className="text-xl font-semibold text-white">Best AI Stack for...</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Pre-built tool recommendations for popular goals
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {EXAMPLE_STACKS.map((stack) => (
              <Link
                key={stack.title}
                href={stack.href}
                className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-800/50 hover:bg-zinc-900/60 transition-all duration-200"
              >
                <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {stack.title}
                </h3>
                <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed flex-1">
                  {stack.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-zinc-600">{stack.tools}</span>
                  <span className="text-emerald-500/70">{stack.cost}</span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Plan this stack <ArrowUpRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </Reveal>

        {/* ─── Featured Tools ──────────────────────────────────── */}
        {featured.length > 0 && (
          <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-semibold text-white">Popular tools people are choosing</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Hand-picked AI tools worth checking out
                </p>
              </div>
              <Link
                href="/tools"
                className="hidden sm:flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all <ArrowRight className="h-4 w-4" />
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-semibold text-white">Head-to-head comparisons</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Deeply-researched editorial verdicts on the questions people actually Google
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {editorialCompares.map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-800/50 hover:bg-zinc-900/60 transition-all duration-200"
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
                    Read the verdict <ArrowUpRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        )}

        {/* ─── Categories ──────────────────────────────────────── */}
        {categories.length > 0 && (
          <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
            <div className="text-center mb-10">
              <h2 className="text-xl font-semibold text-white">Browse by Category</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Find AI tools organized by what they do
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/tools?category=${cat.slug}`}
                  className="group flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all duration-200 text-center"
                >
                  <span className="text-2xl mb-2">{cat.icon ?? '🔧'}</span>
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}

        {/* ─── Bottom CTA — Plan Your Stack ────────────────────── */}
        <Reveal as="section" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/50">
          <div className="rounded-2xl border border-emerald-900/40 bg-gradient-to-b from-emerald-950/20 to-zinc-950 p-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-800/50 bg-emerald-950/40 px-3 py-1 text-xs font-medium text-emerald-400">
              <Zap className="h-3 w-3" />
              Powered by AI
            </div>
            <h2 className="text-2xl font-bold text-white">
              Ready to build?
            </h2>
            <p className="mt-3 text-zinc-400 max-w-lg mx-auto leading-relaxed">
              Describe your goal and get a complete AI tool stack in seconds.
              Costs, tradeoffs, and alternatives — all in one place.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/plan"
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Plan Your Stack
              </Link>
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
