import Link from 'next/link'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'
import { SortableHeader } from '@/components/admin/sortable-header'
import { SearchInput } from '@/components/admin/search-input'
import { parseSort, sortRows } from '@/lib/admin/sort'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Niche Tracker' }

// Sort key → LatestRow field (small dataset → sorted in-memory).
const NICHE_SORT = {
  niche: 'niche',
  impr: 'impressions',
  delta: 'impr_delta_vs_prior',
  pos: 'avg_position',
  clicks: 'clicks',
  queries: 'query_count',
} as const
type NicheSortKey = keyof typeof NICHE_SORT

// Reads the service-role-only measurement views (niche_page_latest /
// niche_page_metrics) seeded from lib/data/best-pages.ts + gsc_snapshots.
// GSC snapshots refresh weekly (Mon cron), so this table moves weekly; pages
// built recently show 0 until Google reports impressions for them (~weeks).
//
// Phase 10.5c.1 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb, kit-styled summary cards with ⓘ provenance;
// dropped the page-local max-w wrapper that double-padded inside the shell).
// Data + query semantics unchanged. Not date-ranged: the view always shows
// the latest weekly 28-day GSC snapshot, so the global filter does not apply.

type LatestRow = {
  slug: string
  niche: string
  tracked_since: string
  impressions: number
  clicks: number
  avg_position: number | null
  impr_delta_vs_prior: number | null
  query_count: number
  snapshot_date: string | null
}

function pos(n: number | null): string {
  return n == null ? '—' : Number(n).toFixed(1)
}

function delta(n: number | null): { text: string; cls: string } {
  if (n == null || n === 0) return { text: '0', cls: 'text-zinc-600' }
  if (n > 0) return { text: `+${n}`, cls: 'text-emerald-400' }
  return { text: `${n}`, cls: 'text-red-400' }
}

export default async function NicheTrackerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim().toLowerCase()
  const sort = parseSort<NicheSortKey>(sp, Object.keys(NICHE_SORT) as NicheSortKey[], { key: 'impr', dir: 'desc' })
  const supabase = getAdminClient()

  const { data: latestData } = await supabase
    .from('niche_page_latest')
    .select('*')
    .order('impressions', { ascending: false })
  let rows = (latestData ?? []) as unknown as LatestRow[]
  if (q) rows = rows.filter((r) => r.niche.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q))

  const snapshotDate = rows.find((r) => r.snapshot_date)?.snapshot_date ?? null
  const withData = sortRows(rows.filter((r) => r.impressions > 0), NICHE_SORT[sort.key], sort.dir)
  const awaiting = rows.filter((r) => r.impressions === 0)
  const totalImpr = rows.reduce((a, r) => a + r.impressions, 0)
  const totalClicks = rows.reduce((a, r) => a + r.clicks, 0)
  const gainers = withData.filter((r) => (r.impr_delta_vs_prior ?? 0) > 0).length

  return (
    <div>
      <PageHeader>
        <p className="text-xs text-zinc-500">
          {rows.length} tracked · 28-day GSC window · snapshot {snapshotDate ?? '—'}
        </p>
      </PageHeader>
      <p className="-mt-2 max-w-3xl text-xs text-zinc-500">
        Impressions for the niche <code className="text-zinc-400">/best</code> pages. Data refreshes
        weekly (latest GSC snapshot — the global range filter does not apply); pages built recently
        read 0 until Google reports them (~2–4 weeks). Clicks stay near 0 until positions move off
        page 4+ — that is authority-gated (doc 20), not a page problem.
      </p>

      {/* Summary — kit-styled cards (exact values kept; counts unchanged) */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Tracked pages', value: rows.length.toLocaleString() },
          { label: 'With impressions', value: withData.length.toLocaleString() },
          { label: 'Gaining vs prior', value: gainers.toLocaleString() },
          { label: 'Total impressions', value: totalImpr.toLocaleString() },
          { label: 'Total clicks', value: totalClicks.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between gap-1">
              <div className="text-xs uppercase tracking-wider text-zinc-500">{s.label}</div>
              <MetricInfo docKey="niche_tracker_summary" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pages with data */}
      <div className="mt-8 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-300">
          Pages with impressions ({withData.length})
        </h2>
        <SearchInput param="q" placeholder="Search niche…" />
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium"><SortableHeader label="Niche" sortKey="niche" firstDir="asc" /></th>
              <th className="px-3 py-2 font-medium text-right"><SortableHeader label="Impr." sortKey="impr" align="right" /></th>
              <th className="px-3 py-2 font-medium text-right"><SortableHeader label="Δ vs prior" sortKey="delta" align="right" /></th>
              <th className="px-3 py-2 font-medium text-right"><SortableHeader label="Avg pos." sortKey="pos" align="right" firstDir="asc" /></th>
              <th className="px-3 py-2 font-medium text-right"><SortableHeader label="Clicks" sortKey="clicks" align="right" /></th>
              <th className="px-3 py-2 font-medium text-right"><SortableHeader label="Queries" sortKey="queries" align="right" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {withData.map((r) => {
              const d = delta(r.impr_delta_vs_prior)
              return (
                <tr key={r.slug} className="text-zinc-300 hover:bg-zinc-900/30">
                  <td className="px-3 py-2">
                    <Link
                      href={`/best/${r.slug}`}
                      className="text-emerald-400 hover:text-emerald-300"
                      target="_blank"
                    >
                      {r.niche}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.impressions.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${d.cls}`}>{d.text}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{pos(r.avg_position)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.clicks}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-500">{r.query_count}</td>
                </tr>
              )
            })}
            {withData.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-zinc-600">
                  No niche pages have impressions in the latest snapshot yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Awaiting first data */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-zinc-300">
        Awaiting first impressions ({awaiting.length})
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {awaiting.map((r) => (
          <Link
            key={r.slug}
            href={`/best/${r.slug}`}
            target="_blank"
            className="rounded border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:border-zinc-700"
          >
            {r.niche}
          </Link>
        ))}
      </div>
    </div>
  )
}
