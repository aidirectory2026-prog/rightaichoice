import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { STACKS } from '@/lib/data/stacks'

export const metadata: Metadata = {
  title: 'AI Tool Stacks — Best AI Tools for Every Goal',
  description:
    'Pre-built AI tool stacks for popular goals. Launch a SaaS, start a YouTube channel, run a marketing agency, and more — with costs, alternatives, and tradeoffs.',
}

export default function StacksIndexPage() {
  return (
    <>
      <Navbar />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-zinc-950 to-zinc-950" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Best AI Stack for <span className="text-emerald-400">Every Goal</span>
            </h1>
            <p className="mt-4 text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Curated tool recommendations for each stage of your project.
              Costs, alternatives, and tradeoffs included.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STACKS.map((stack) => (
              <Link
                key={stack.slug}
                href={`/stacks/${stack.slug}`}
                className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 hover:border-emerald-800/50 hover:bg-zinc-900/60 transition-all duration-200"
              >
                <h2 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                  {stack.goal}
                </h2>
                <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed flex-1 line-clamp-2">
                  {stack.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-zinc-600">{stack.stages.length} stages</span>
                  <span className="text-emerald-500/70">{stack.summary.paidPath}</span>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  View stack <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>

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
      </main>

      <Footer />
    </>
  )
}
