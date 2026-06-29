// Phase 13 D2.2b — per-category "State of AI [X]" reports (programmatic linkable assets).
//
// One data-report page per category (e.g. /state-of-ai-tools/marketing-seo), each
// computed live from our catalog. Every page is a new SEO surface + a new PR angle
// + AI-citation bait — and it compounds the main report + PR engine.
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { jsonLdScriptProps } from '@/lib/seo/json-ld'
import { buildStateOfCategory, getCategoryList } from '@/lib/geo/state-of-ai'

export const dynamic = 'force-static'
export const revalidate = 86400
export const runtime = 'nodejs'

const SITE = 'https://rightaichoice.com'

type PageProps = { params: Promise<{ category: string }> }

export async function generateStaticParams() {
  const cats = await getCategoryList()
  return cats.map((c) => ({ category: c.slug }))
}

async function nameForSlug(slug: string): Promise<string | null> {
  const cats = await getCategoryList()
  return cats.find((c) => c.slug === slug)?.name ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params
  const name = await nameForSlug(category)
  if (!name) return { title: 'State of AI Tools' }
  const url = `${SITE}/state-of-ai-tools/${category}`
  return {
    title: `State of AI ${name} Tools 2026 — Pricing, Viability & Data`,
    description: `Original data on AI tools in ${name}: how many are free, viability-risk distribution, top tools, and pricing — from RightAIChoice's continuously-verified catalog.`,
    alternates: { canonical: url },
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function CategoryReportPage({ params }: PageProps) {
  const { category } = await params
  const name = await nameForSlug(category)
  if (!name) notFound()

  const s = await buildStateOfCategory(category, name)
  if (s.totalPublished === 0) notFound()
  const today = fmtDate(s.generatedAt)
  const url = `${SITE}/state-of-ai-tools/${category}`

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `State of AI ${name} Tools 2026`,
    description: `Original data on AI tools in the ${name} category.`,
    url,
    datePublished: '2026-06-30',
    dateModified: s.generatedAt,
    author: { '@type': 'Organization', name: 'RightAIChoice', url: SITE },
    publisher: { '@type': 'Organization', name: 'RightAIChoice', url: SITE },
  }

  return (
    <>
      <script {...jsonLdScriptProps([articleSchema])} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 text-zinc-200">
        <p className="text-xs uppercase tracking-wider text-indigo-400">
          Data report · updated {today} · <Link href="/state-of-ai-tools" className="hover:underline">all categories</Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">State of AI {name} Tools 2026</h1>

        <div className="mt-6 rounded-lg border border-indigo-900/50 bg-indigo-950/10 p-5 text-sm leading-relaxed">
          <p className="mb-2 font-semibold text-indigo-200">Key findings — {name}</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>RightAIChoice tracks <strong>{s.totalPublished.toLocaleString()}</strong> AI tools in {name}, with <strong>{s.verified7d.toLocaleString()} ({s.verified7dPct}%)</strong> re-verified in the last 7 days.</li>
            <li><strong>{s.freeOrFreemiumPct}%</strong> of {name} tools are free or freemium.</li>
            {s.viability.avg != null && (
              <li>Average viability score is <strong>{s.viability.avg}/100</strong> across {s.viability.scored.toLocaleString()} scored tools.</li>
            )}
          </ul>
        </div>

        <Section title="Pricing breakdown">
          <StatTable rows={s.pricingMix} unit="tools" />
        </Section>

        <Section title="Viability distribution">
          <StatTable rows={[s.viability.strong, s.viability.moderate, s.viability.atRisk]} unit="tools" denom />
        </Section>

        {s.topByStars.length > 0 && (
          <Section title="Most-starred open-source tools in this category">
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr><th className="px-3 py-2 text-left">Tool</th><th className="px-3 py-2 text-right">GitHub stars</th></tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {s.topByStars.map((t) => (
                    <tr key={t.slug}>
                      <td className="px-3 py-2"><Link href={`/tools/${t.slug}`} className="text-indigo-300 hover:underline">{t.name}</Link></td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-300">{t.stars.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <Section title="Cite this report">
          <p className="text-sm text-zinc-400">
            Free to cite with attribution: “State of AI {name} Tools 2026, RightAIChoice — <span className="text-zinc-300">{url}</span>” (data as of {today}). See the{' '}
            <Link href="/state-of-ai-tools" className="text-indigo-300 hover:underline">full State of AI Tools report</Link> ·{' '}
            <Link href={`/categories/${category}`} className="text-indigo-300 hover:underline">browse {name} tools</Link>.
          </p>
        </Section>

        <p className="mt-10 text-xs text-zinc-600">Computed live from RightAIChoice's continuously-verified catalog. Generated {today}.</p>
      </main>
      <Footer />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  )
}

function StatTable({ rows, unit, denom }: { rows: { label: string; count: number; pct: number }[]; unit: string; denom?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">Segment</th>
            <th className="px-3 py-2 text-right">{unit}</th>
            <th className="px-3 py-2 text-right">share{denom ? ' (of scored)' : ''}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="px-3 py-2 text-zinc-200">{r.label}</td>
              <td className="px-3 py-2 text-right font-mono text-zinc-300">{r.count.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-mono text-zinc-400">{r.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
