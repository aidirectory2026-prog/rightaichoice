// Phase 13 D2.2 — "State of AI Tools" : a public, citable data report.
//
// Original statistics from our continuously-verified catalog of ~2,000 tools —
// the kind of proprietary data journalists and LLMs cite. Answer-first TL;DR +
// tables + sourced/dated + Dataset/Article JSON-LD (citation-optimized, D3.1 shape).
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import Link from 'next/link'
import { jsonLdScriptProps } from '@/lib/seo/json-ld'
import { buildStateOfAI } from '@/lib/geo/state-of-ai'

export const revalidate = 86400
export const runtime = 'nodejs'

const PAGE_URL = 'https://rightaichoice.com/state-of-ai-tools'

export const metadata = {
  title: 'State of AI Tools 2026 — Pricing, Viability & Category Data',
  description:
    'Original data on ~2,000 continuously-verified AI tools: how many are free, the viability-risk distribution, the biggest categories, and more. Updated continuously by RightAIChoice.',
  alternates: { canonical: PAGE_URL },
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function StateOfAIToolsPage() {
  const s = await buildStateOfAI()
  const today = fmtDate(s.generatedAt)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'State of AI Tools 2026',
    description: metadata.description,
    url: PAGE_URL,
    datePublished: '2026-06-27',
    dateModified: s.generatedAt,
    author: { '@type': 'Organization', name: 'RightAIChoice', url: 'https://rightaichoice.com' },
    publisher: { '@type': 'Organization', name: 'RightAIChoice', url: 'https://rightaichoice.com' },
  }
  const datasetSchema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'State of AI Tools — RightAIChoice',
    description: metadata.description,
    url: PAGE_URL,
    dateModified: s.latestVerify,
    creator: { '@type': 'Organization', name: 'RightAIChoice', url: 'https://rightaichoice.com' },
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/x-ndjson', contentUrl: 'https://rightaichoice.com/llms.jsonl' },
    ],
  }

  return (
    <>
      <script {...jsonLdScriptProps([articleSchema, datasetSchema])} />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-12 text-zinc-200">
        <p className="text-xs uppercase tracking-wider text-indigo-400">Data report · updated {today}</p>
        <h1 className="mt-2 text-3xl font-bold text-white">State of AI Tools 2026</h1>

        {/* Answer-first TL;DR (inverted pyramid — highest-leverage GEO structure) */}
        <div className="mt-6 rounded-lg border border-indigo-900/50 bg-indigo-950/10 p-5 text-sm leading-relaxed">
          <p className="mb-2 font-semibold text-indigo-200">Key findings</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              RightAIChoice tracks <strong>{s.totalPublished.toLocaleString()}</strong> AI tools, with{' '}
              <strong>{s.verified7d.toLocaleString()} ({s.verified7dPct}%)</strong> re-verified in the last 7 days
              (most recent: {fmtDate(s.latestVerify)}).
            </li>
            <li>
              <strong>{s.freeOrFreemiumPct}%</strong> of AI tools are free or freemium; the full pricing breakdown is below.
            </li>
            {s.viability.avg != null && (
              <li>
                Across {s.viability.scored.toLocaleString()} scored tools, the average viability score is{' '}
                <strong>{s.viability.avg}/100</strong>; <strong>{s.viability.atRisk.pct}%</strong> score as
                “at risk” (below 40) and <strong>{s.viability.strong.pct}%</strong> as “strong” (70+).
              </li>
            )}
            {s.topCategories[0] && (
              <li>
                The largest category is <strong>{s.topCategories[0].label}</strong> ({s.topCategories[0].count} tools).
              </li>
            )}
          </ul>
        </div>

        <Section title="Pricing breakdown">
          <StatTable rows={s.pricingMix} unit="tools" />
        </Section>

        <Section title="Viability (will it still be here next year?)">
          <p className="mb-3 text-sm text-zinc-400">
            Our editorial viability score (0–100) blends momentum, adoption, and wrapper-vs-original signals.
            It is a risk indicator, not a prediction. {s.viability.scored.toLocaleString()} tools are scored
            {s.viability.avg != null && <> (average {s.viability.avg}/100)</>}.
          </p>
          <StatTable rows={[s.viability.strong, s.viability.moderate, s.viability.atRisk]} unit="tools" denom={s.viability.scored} />
        </Section>

        <Section title="Biggest categories">
          <StatTable rows={s.topCategories} unit="tools" />
        </Section>

        {s.topByStars.length > 0 && (
          <Section title="Most-starred open-source AI tools">
            <p className="mb-3 text-sm text-zinc-400">
              {s.withGithub.toLocaleString()} tracked tools have a public GitHub repo, totalling{' '}
              {s.totalStars.toLocaleString()} stars.
            </p>
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
            Free to cite with attribution. Suggested: “State of AI Tools 2026, RightAIChoice —{' '}
            <span className="text-zinc-300">{PAGE_URL}</span>” (data as of {today}). Machine-readable data:{' '}
            <Link href="/llms.jsonl" className="text-indigo-300 hover:underline">/llms.jsonl</Link>. Methodology:{' '}
            <Link href="/methodology" className="text-indigo-300 hover:underline">/methodology</Link>.
          </p>
        </Section>

        <p className="mt-10 text-xs text-zinc-600">
          Figures are computed live from RightAIChoice's continuously-verified catalog and change as tools are
          re-verified. Generated {today}.
        </p>
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

function StatTable({ rows, unit, denom }: { rows: { label: string; count: number; pct: number }[]; unit: string; denom?: number }) {
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
