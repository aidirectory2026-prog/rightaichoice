import Link from 'next/link'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Niche Tracker' }

// Reads the service-role-only measurement views (niche_page_latest /
// niche_page_metrics) seeded from lib/data/best-pages.ts + gsc_snapshots.
// GSC snapshots refresh weekly (Mon cron), so this table moves weekly; pages
// built recently show 0 until Google reports impressions for them (~weeks).

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

export default async function NicheTrackerPage() {
  const supabase = getAdminClient()

  const { data: latestData } = await supabase
    .from('niche_page_latest')
    .select('*')
    .order('impressions', { ascending: false })
  const rows = (latestData ?? []) as unknown as LatestRow[]

  const snapshotDate = rows.find((r) => r.snapshot_date)?.snapshot_date ?? null
  const withData = rows.filter((r) => r.impressions > 0)
  const awaiting = rows.filter((r) => r.impressions === 0)
  const totalImpr = rows.reduce((a, r) => a + r.impressions, 0)
  const totalClicks = rows.reduce((a, r) => a + r.clicks, 0)
  const gainers = withData.filter((r) => (r.impr_delta_vs_prior ?? 0) > 0).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold text-white">Niche page tracker</h1>
        <p className="text-xs text-zinc-500">
          {rows.length} tracked · 28-day GSC window · snapshot {snapshotDate ?? '—'}
        </p>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Impressions for the niche <code className="text-zinc-400">/best</code> pages. Data refreshes
        weekly; pages built recently read 0 until Google reports them (~2–4 weeks). Clicks stay near
        0 until positions move off page 4+ — that is authority-gated (doc 20), not a page problem.
      </p>

      {/* Summary */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Tracked pages', value: rows.length },
          { label: 'With impressions', value: withData.length },
          { label: 'Gaining vs prior', value: gainers },
          { label: 'Total impressions', value: totalImpr.toLocaleString() },
          { label: 'Total clicks', value: totalClicks.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-2xl font-semibold text-white">{s.value}</div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pages with data */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-zinc-300">
        Pages with impressions ({withData.length})
      </h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Niche</th>
              <th className="px-3 py-2 font-medium text-right">Impr.</th>
              <th className="px-3 py-2 font-medium text-right">Δ vs prior</th>
              <th className="px-3 py-2 font-medium text-right">Avg pos.</th>
              <th className="px-3 py-2 font-medium text-right">Clicks</th>
              <th className="px-3 py-2 font-medium text-right">Queries</th>
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
