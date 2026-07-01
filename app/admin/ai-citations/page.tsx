// Phase 9 Smart SEO / doc 08 (AEO/GEO) + doc 11 (KPIs): AI citation log.
//
// "Being cited is the new being ranked." Manual-first tracking (doc 08): run
// representative queries through the answer engines weekly and log whether RAC
// was cited, by which engine, and where. KPIs surface the 30-day target (10
// citations) + citation rate. Server-rendered via getAdminClient; admin-gated
// by app/admin/layout.tsx. Writes go through ./actions.ts.
//
// Phase 10.5c.1 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb, kit-styled KPI cards with ⓘ provenance). Data +
// query semantics unchanged: the KPI window stays a FIXED rolling 30 days
// (the doc-11 target definition — custom control kept), so the global
// range filter does not apply here.
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'
import { SortableHeader } from '@/components/admin/sortable-header'
import { MultiSelectFilter } from '@/components/admin/multi-select-filter'
import { SearchInput } from '@/components/admin/search-input'
import { parseSort } from '@/lib/admin/sort'
import { addCitation, deleteCitation } from './actions'
import { loadGeoCitationPanel } from '@/lib/geo/admin-queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'AI Citations — Admin' }

type Citation = {
  id: string
  checked_on: string
  engine: string
  query: string
  cited: boolean
  cited_url: string | null
  position_in_answer: number | null
  brand_mention: boolean
  notes: string | null
  created_at: string
}

const ENGINE_LABEL: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  perplexity: 'Perplexity',
  google_aio: 'Google AI Overview',
  gemini: 'Gemini',
  copilot: 'Copilot',
  other: 'Other',
}
const ENGINE_OPTIONS = Object.keys(ENGINE_LABEL)
const ENGINE_FILTER_OPTIONS = ENGINE_OPTIONS.map((e) => ({ value: e, label: ENGINE_LABEL[e] }))

// Sort key → ai_citations column (recent log table).
const CITATION_SORT = {
  date: 'checked_on',
  engine: 'engine',
  query: 'query',
  pos: 'position_in_answer',
  cited: 'cited',
} as const
type CitationSortKey = keyof typeof CITATION_SORT

function listParam(v: string | undefined): string[] {
  return (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

export default async function AiCitationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const db = getAdminClient()

  // Filters + sort for the recent log (KPIs + GEO panel below are unaffected).
  const engineSel = listParam(sp.engine).filter((e) => ENGINE_OPTIONS.includes(e))
  const citedSel = sp.cited === 'yes' ? true : sp.cited === 'no' ? false : undefined
  const brandSel = sp.brand === 'yes' ? true : sp.brand === 'no' ? false : undefined
  const q = (sp.q ?? '').trim().replace(/[^a-zA-Z0-9 ._-]/g, '').slice(0, 60)
  const sort = parseSort<CitationSortKey>(sp, Object.keys(CITATION_SORT) as CitationSortKey[], { key: 'date', dir: 'desc' })
  const logFiltered = engineSel.length > 0 || citedSel !== undefined || brandSel !== undefined || !!q

  // Recent rows for display (manual log → low volume, cap 500), filtered+sorted.
  let logQuery = db
    .from('ai_citations')
    .select('id, checked_on, engine, query, cited, cited_url, position_in_answer, brand_mention, notes, created_at')
    .order(CITATION_SORT[sort.key], { ascending: sort.dir === 'asc', nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(500)
  if (engineSel.length) logQuery = logQuery.in('engine', engineSel)
  if (citedSel !== undefined) logQuery = logQuery.eq('cited', citedSel)
  if (brandSel !== undefined) logQuery = logQuery.eq('brand_mention', brandSel)
  if (q) logQuery = logQuery.ilike('query', `%${q}%`)
  const { data } = await logQuery
  const rows = ((data ?? []) as Citation[])

  // All-time logged count (cheap exact count, no row transfer).
  const { count: totalAll } = await db
    .from('ai_citations')
    .select('id', { count: 'exact', head: true })

  // ── 30-day KPIs (computed in SQL — `current_date - 30` keeps render pure and
  //    makes the window a true rolling DB window, not a request-time snapshot). ──
  const exec = db as unknown as {
    rpc: (fn: string, args: { p_sql: string }) => Promise<{ data: unknown }>
  }
  const { data: sumData } = await exec.rpc('_admin_audit_exec', {
    p_sql: `
      SELECT
        count(*) FILTER (WHERE cited)::int AS cited_30d,
        count(*)::int AS checked_30d,
        count(DISTINCT engine) FILTER (WHERE cited)::int AS engines_30d
      FROM ai_citations
      WHERE checked_on >= current_date - interval '30 days'`,
  })
  const s = (Array.isArray(sumData) ? sumData[0] : sumData) as
    | { cited_30d: number; checked_30d: number; engines_30d: number }
    | undefined
  const cited30 = Number(s?.cited_30d ?? 0)
  const checked30 = Number(s?.checked_30d ?? 0)
  const engines30 = Number(s?.engines_30d ?? 0)
  const rate30 = checked30 > 0 ? Math.round((cited30 / checked30) * 100) : 0
  const KPI_TARGET = 10 // doc 11: 10 AI-Overview citations by day 30

  // Cited-count by engine (30d) for the breakdown strip.
  const { data: engData } = await exec.rpc('_admin_audit_exec', {
    p_sql: `
      SELECT engine, count(*)::int AS n FROM ai_citations
      WHERE cited AND checked_on >= current_date - interval '30 days'
      GROUP BY engine ORDER BY n DESC`,
  })
  const byEngine = (Array.isArray(engData) ? (engData as { engine: string; n: number }[]) : [])

  // Phase 13 D3.4 — automated GEO tracking (geo_citation_snapshots).
  const geo = await loadGeoCitationPanel()

  return (
    <div className="space-y-8">
      <div>
        <PageHeader />
        <p className="-mt-3 max-w-3xl text-xs text-zinc-500">
          Manual log of when RightAIChoice is cited by an answer engine (doc 08 AEO/GEO).
          Run ~20–30 representative queries weekly through ChatGPT, Claude, Perplexity, and
          Google AI Overview; log each hit (and notable misses). The KPI window is a fixed
          rolling 30 days (doc-11 target: <span className="text-zinc-300">{KPI_TARGET} citations</span>)
          — the global range filter does not apply here.
        </p>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Citations (30d)"
          value={`${cited30}`}
          sub={`target ${KPI_TARGET}`}
          tone={cited30 >= KPI_TARGET ? 'ok' : cited30 > 0 ? 'warn' : 'bad'}
          info={<MetricInfo docKey="ai_citations_kpis" />}
        />
        <Kpi label="Distinct engines (30d)" value={`${engines30}`} info={<MetricInfo docKey="ai_citations_kpis" />} />
        <Kpi label="Citation rate (30d)" value={`${rate30}%`} sub={`${cited30}/${checked30} checked`} info={<MetricInfo docKey="ai_citations_kpis" />} />
        <Kpi label="Total logged" value={`${totalAll ?? rows.length}`} info={<MetricInfo docKey="ai_citations_kpis" />} />
      </div>

      {byEngine.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byEngine.map((x) => (
            <span
              key={x.engine}
              className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300"
            >
              {ENGINE_LABEL[x.engine]} <span className="text-zinc-500">·</span>{' '}
              <span className="font-semibold text-emerald-300">{x.n}</span>
            </span>
          ))}
        </div>
      )}

      {/* Phase 13 D3.4 — automated GEO tracking (geo_citation_snapshots) */}
      <section className="rounded-lg border border-indigo-900/50 bg-indigo-950/10 p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-indigo-200">
            Automated GEO tracking
            <span className="ml-2 font-normal text-zinc-500">
              {geo.hasData
                ? `${ENGINE_LABEL[geo.engine ?? ''] ?? geo.engine} · ${geo.showingStale ? 'last good run' : 'latest run'} ${fmtDate(geo.snapshotDate)}`
                : 'no runs yet'}
            </span>
          </h2>
          <span className="text-[11px] text-zinc-500">
            Weekly cron asks {geo.total || 'N'} target prompts through a web-searching AI and records whether we’re cited (Phase 13 D3.4).
          </span>
        </div>

        {/* Infra-failure alert: the latest run wholly errored (e.g. API credits)
            — show it as an engine problem to fix, NOT as a 0% citation result. */}
        {geo.lastRunFailed && (
          <div className="mb-4 rounded-md border border-amber-800/60 bg-amber-950/20 p-3 text-xs text-amber-200">
            <span className="font-semibold">Last automated run didn’t complete.</span>{' '}
            The {ENGINE_LABEL[geo.lastRunEngine ?? ''] ?? geo.lastRunEngine} run on {fmtDate(geo.lastRunDate)} failed for every prompt
            {geo.lastRunError ? <> — <span className="text-amber-100">{geo.lastRunError}</span></> : ''}.
            This is an engine/billing issue, not a citation result. Fix: set <code className="text-amber-100">GEMINI_API_KEY</code> (free engine) for the
            weekly cron, or top up the Anthropic balance, then re-run <code className="text-amber-100">npm run geo:track</code>.
            {geo.showingStale && <> Metrics below show the last <span className="font-medium">successful</span> run.</>}
          </div>
        )}

        {!geo.hasData ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
            No automated runs yet. Once <code className="text-zinc-300">GEMINI_API_KEY</code> is set, the weekly
            <code className="text-zinc-300"> track-geo-citations</code> cron (or <code className="text-zinc-300">npm run geo:track</code>)
            populates this panel.
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi
                label="Auto citation rate"
                value={`${geo.rate}%`}
                sub={`${geo.cited}/${geo.total} prompts`}
                tone={geo.cited > 0 ? 'ok' : 'bad'}
              />
              <Kpi label="Prompts tracked" value={`${geo.total}`} />
              <Kpi
                label="Best rank"
                value={
                  geo.rows.some((r) => r.citation_rank)
                    ? `#${Math.min(...geo.rows.filter((r) => r.citation_rank).map((r) => r.citation_rank as number))}`
                    : '—'
                }
                sub="among cited domains"
              />
              <Kpi
                label="Trend (rate)"
                value={geo.trend.length ? geo.trend.map((t) => `${t.rate}%`).slice(0, 5).reverse().join(' → ') : '—'}
              />
            </div>

            {geo.topCompetitors.length > 0 && (
              <div className="mb-3">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">Competitors cited this run: </span>
                {geo.topCompetitors.map((c) => (
                  <span key={c.domain} className="ml-1 inline-block rounded-full border border-zinc-700 bg-zinc-900/60 px-2 py-0.5 text-[11px] text-zinc-300">
                    {c.domain} <span className="font-semibold text-amber-300">×{c.n}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Prompt</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-center">Cited</th>
                    <th className="px-3 py-2 text-right">Rank</th>
                    <th className="px-3 py-2 text-right">Share of voice</th>
                    <th className="px-3 py-2 text-left">Competitors cited</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {geo.rows.map((r) => (
                    <tr key={r.prompt_id} className={r.cited ? 'bg-emerald-950/15' : r.error ? 'bg-amber-950/15' : 'bg-rose-950/10'}>
                      <td className="px-3 py-2 font-mono text-[11px] text-zinc-300">{r.prompt_id}</td>
                      <td className="px-3 py-2 text-xs text-zinc-500">{r.prompt_category ?? '—'}</td>
                      <td className="px-3 py-2 text-center text-xs">
                        {r.error ? (
                          <span className="text-amber-400" title={r.error}>err</span>
                        ) : r.cited ? (
                          <span className="text-emerald-400">✓</span>
                        ) : r.retrieved ? (
                          <span className="text-zinc-500" title="seen but not cited">seen</span>
                        ) : (
                          <span className="text-rose-400">✗</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">{r.citation_rank ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">
                        {r.share_of_voice != null ? `${Math.round(r.share_of_voice * 100)}%` : '—'}
                      </td>
                      <td className="max-w-xs truncate px-3 py-2 text-xs text-zinc-500">
                        {r.competitors.map((c) => c.domain).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Add form */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-200">Log a citation (manual)</h2>
        <form
          action={addCitation}
          className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Date checked">
            <input type="date" name="checked_on" className={inputCls} />
          </Field>
          <Field label="Engine">
            <select name="engine" required defaultValue="perplexity" className={inputCls}>
              {ENGINE_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {ENGINE_LABEL[e]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Query" className="sm:col-span-2">
            <input
              type="text"
              name="query"
              required
              placeholder="best ai coding tools"
              className={inputCls}
            />
          </Field>
          <Field label="Cited URL (path)" className="sm:col-span-2">
            <input type="text" name="cited_url" placeholder="/compare/cursor-vs-copilot" className={inputCls} />
          </Field>
          <Field label="Position in answer">
            <input type="number" name="position_in_answer" min={1} placeholder="1" className={inputCls} />
          </Field>
          <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
            <input type="text" name="notes" placeholder="cited alongside G2; summarized our verdict" className={inputCls} />
          </Field>
          <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-1">
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              <input type="checkbox" name="cited" defaultChecked className="accent-emerald-500" /> Cited
            </label>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300">
              <input type="checkbox" name="brand_mention" className="accent-emerald-500" /> Brand mention
            </label>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Log citation
            </button>
          </div>
        </form>
      </section>

      {/* Recent entries */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-200">
          Recent <span className="font-normal text-zinc-500">({rows.length}{logFiltered ? ' filtered' : ''})</span>
        </h2>
        {/* Phase 14 — filters for the log */}
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <SearchInput param="q" placeholder="Search query…" />
          <MultiSelectFilter label="Engine" param="engine" options={ENGINE_FILTER_OPTIONS} />
          <MultiSelectFilter label="Cited" param="cited" options={[{ value: 'yes', label: 'Cited' }, { value: 'no', label: 'Not cited' }]} />
          <MultiSelectFilter label="Brand" param="brand" options={[{ value: 'yes', label: 'Mention' }, { value: 'no', label: 'No mention' }]} />
        </div>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500">
            {logFiltered
              ? 'No citations match these filters — try clearing some.'
              : 'No citations logged yet. Run a few queries through the answer engines and log the hits above.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left"><SortableHeader label="Date" sortKey="date" /></th>
                  <th className="px-3 py-2 text-left"><SortableHeader label="Engine" sortKey="engine" firstDir="asc" /></th>
                  <th className="px-3 py-2 text-left"><SortableHeader label="Query" sortKey="query" firstDir="asc" /></th>
                  <th className="px-3 py-2 text-left">Cited URL</th>
                  <th className="px-3 py-2 text-right"><SortableHeader label="Pos" sortKey="pos" align="right" /></th>
                  <th className="px-3 py-2 text-left">Notes</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.map((r) => (
                  <tr key={r.id} className={r.cited ? 'bg-zinc-950/30' : 'bg-rose-950/15'}>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-400">{fmtDate(r.checked_on)}</td>
                    <td className="px-3 py-2">
                      <span className="rounded border border-zinc-700 bg-zinc-900/60 px-2 py-0.5 text-[11px] text-zinc-300">
                        {ENGINE_LABEL[r.engine] ?? r.engine}
                      </span>
                    </td>
                    <td className="max-w-xs px-3 py-2 text-xs text-zinc-200">
                      {r.query}
                      {!r.cited && <span className="ml-2 text-[10px] text-rose-400">not cited</span>}
                      {r.brand_mention && <span className="ml-2 text-[10px] text-sky-400">brand mention</span>}
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2 font-mono text-[11px] text-zinc-400" title={r.cited_url ?? ''}>
                      {r.cited_url ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-zinc-400">{r.position_in_answer ?? '—'}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-xs text-zinc-500" title={r.notes ?? ''}>
                      {r.notes ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <form action={deleteCitation}>
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="text-[11px] text-zinc-600 transition-colors hover:text-rose-400"
                          title="Delete this entry"
                        >
                          delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

const inputCls =
  'w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none'

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
      {children}
    </label>
  )
}

// Kit-styled KPI card (tone coloring + sub line — kit MetricCard is
// plain-number-only) with the shared ⓘ provenance slot.
function Kpi({ label, value, sub, tone, info }: { label: string; value: string; sub?: string; tone?: 'ok' | 'bad' | 'warn'; info?: React.ReactNode }) {
  const color =
    tone === 'bad' ? 'text-rose-400' : tone === 'warn' ? 'text-amber-400' : tone === 'ok' ? 'text-emerald-400' : 'text-white'
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between gap-1">
        <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
        {info ?? null}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-zinc-600">{sub}</div>}
    </div>
  )
}
