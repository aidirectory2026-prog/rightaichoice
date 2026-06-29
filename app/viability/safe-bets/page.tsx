import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ViabilityBadge } from '@/components/tools/viability-badge'
import { ToolLogo } from '@/components/tools/tool-logo'
import { ToolPagination } from '@/components/tools/tool-pagination'
import { createClient } from '@/lib/supabase/server'
import { pricingLabel, pricingColor } from '@/lib/utils'
import { VIABILITY_SAFE_BET } from '@/lib/viability'

export const revalidate = 3600

const PAGE_SIZE = 50

export const metadata: Metadata = {
  // BUG-39: copy now matches the unified ≥70 "Safe bet" threshold (was 85+).
  title: `Safe Bet AI Tools (Viability Score ${VIABILITY_SAFE_BET}+)`,
  description:
    `AI tools with the strongest survival signals. These tools scored ${VIABILITY_SAFE_BET}+ on our viability model — well-funded, active development, proprietary tech.`,
  openGraph: {
    title: 'Safe Bet AI Tools — RightAIChoice',
    description: 'AI tools most likely to thrive over the next 12 months.',
    url: 'https://rightaichoice.com/viability/safe-bets',
  },
  alternates: { canonical: 'https://rightaichoice.com/viability/safe-bets' },
}

// BUG-40: count:'exact' for the TRUE total (the old .limit(100) under-counted),
// real viability_updated_at for the "Updated" line (was new Date() = always
// "now", which is dishonest + makes Google distrust the freshness signal), and
// range-based pagination so a >page-size set is fully reachable.
async function getSafeBetTools(page: number) {
  const supabase = await createClient()
  const from = (page - 1) * PAGE_SIZE
  const { data, count } = await supabase
    .from('tools')
    .select('id, name, slug, tagline, logo_url, website_url, viability_score, viability_signals, pricing_type, viability_updated_at', { count: 'exact' })
    .eq('is_published', true)
    .not('viability_score', 'is', null)
    .gte('viability_score', VIABILITY_SAFE_BET)
    .order('viability_score', { ascending: false })
    .range(from, from + PAGE_SIZE - 1)

  const rows = data ?? []
  const latestUpdate = rows
    .map((t) => (t as { viability_updated_at: string | null }).viability_updated_at)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1)
  return { tools: rows, total: count ?? rows.length, latestUpdate }
}

export default async function SafeBetsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)
  const { tools, total, latestUpdate } = await getSafeBetTools(page)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

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
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
              <h1 className="text-3xl font-bold text-white">Safe Bet AI Tools</h1>
            </div>
            <p className="text-zinc-400 max-w-2xl leading-relaxed">
              These tools scored {VIABILITY_SAFE_BET} or above on our viability model. Strong funding, active development,
              proprietary technology, and low platform risk. Build your workflow around these with confidence.
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              {total} tools
              {latestUpdate
                ? ` · Updated ${new Date(latestUpdate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                : ''}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          {tools.length === 0 ? (
            <div className="py-20 text-center text-zinc-500">
              No safe-bet tools found yet. Viability scores may still be calculating.{' '}
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
                  className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-emerald-900/50 transition-colors"
                >
                  <span className="text-xs font-mono text-zinc-600 w-6 text-right">
                    {(page - 1) * PAGE_SIZE + index + 1}.
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

          {/* BUG-40: pagination so safe-bets beyond the first page are reachable. */}
          {totalPages > 1 && <ToolPagination page={page} totalPages={totalPages} total={total} />}

          {/* CTA */}
          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-lg font-semibold text-white mb-2">
              Build a safe AI stack
            </h2>
            <p className="text-sm text-zinc-500 mb-5">
              Our Stack Planner prioritizes tools with strong viability scores.
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
