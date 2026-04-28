import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldX, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ViabilityBadge } from '@/components/tools/viability-badge'
import { ToolLogo } from '@/components/tools/tool-logo'
import { createClient } from '@/lib/supabase/server'
import { pricingLabel, pricingColor } from '@/lib/utils'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'At-Risk AI Tools (Viability Score <40)',
  description:
    'AI tools with the highest shutdown risk. These tools scored below 40 on our viability model — consider alternatives before investing.',
  openGraph: {
    title: 'At-Risk AI Tools — RightAIChoice',
    description: 'AI tools most likely to shut down in the next 12 months.',
    url: 'https://rightaichoice.com/viability/at-risk',
  },
  alternates: { canonical: 'https://rightaichoice.com/viability/at-risk' },
}

async function getAtRiskTools() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tools')
    .select('id, name, slug, tagline, logo_url, website_url, viability_score, viability_signals, pricing_type')
    .eq('is_published', true)
    .not('viability_score', 'is', null)
    .lt('viability_score', 40)
    .order('viability_score', { ascending: true })
    .limit(100)

  return data ?? []
}

export default async function AtRiskPage() {
  const tools = await getAtRiskTools()

  return (
    <>
      <Navbar />

      <main className="flex-1">
        <div className="border-b border-zinc-800 bg-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <Link
              href="/viability"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Viability Scores
            </Link>

            <div className="flex items-center gap-3 mb-3">
              <ShieldX className="h-7 w-7 text-red-400" />
              <h1 className="text-3xl font-bold text-white">At-Risk AI Tools</h1>
            </div>
            <p className="text-zinc-400 max-w-2xl leading-relaxed">
              These tools scored below 40 on our viability model. Multiple risk signals are present — wrapper
              dependency, low funding indicators, or high category mortality. Consider alternatives before
              building critical workflows around them.
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              {tools.length} tools · Updated {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          {tools.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">
              No at-risk tools found yet. Viability scores may still be calculating.{' '}
              <Link href="/viability" className="text-emerald-400 hover:text-emerald-300">
                View methodology
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tools.map((tool, index) => (
                <Link
                  key={tool.id}
                  href={`/tools/${tool.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-red-900/50 transition-colors"
                >
                  <span className="text-xs font-mono text-zinc-600 w-6 text-right">
                    {index + 1}.
                  </span>

                  <ToolLogo
                    tool={tool}
                    size={40}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 overflow-hidden border border-zinc-700"
                    fallbackClassName="text-sm font-bold text-zinc-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white truncate">{tool.name}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${pricingColor(tool.pricing_type)}`}>
                        {pricingLabel(tool.pricing_type)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1">{tool.tagline}</p>
                  </div>

                  <ViabilityBadge score={tool.viability_score} size="md" showLabel />
                </Link>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Need safer alternatives?
            </h2>
            <p className="text-sm text-zinc-500 mb-5">
              Tell us your use case and we'll recommend tools with strong viability scores.
            </p>
            <Link
              href="/recommend"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              Find Safe Alternatives
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
