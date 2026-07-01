// Phase 9 S7 — Market Sentiment Checker admin panel.
// Phase 10.5b.4 (2026-06-12) — rebuilt on the shared kit, NOW WINDOWED
// (audit F13 fix): every number on this page used to be all-time,
// unwindowed and unfiltered; the funnel legs are now windowed + humans-only
// by default (bots toggle + smart filters via the shared mirror), and the
// revenue / scans / payments panels are windowed. sentiment_searches and
// sentiment_payments have no bot column, so those panels honor the date
// range only — stated inline. An explicit "All time" preset link keeps the
// old view one click away (from = 2026-05-20, the user_events mirror epoch).

import Link from 'next/link'
import { IndianRupee } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import { FunnelStrip } from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { withCohort } from '@/lib/admin/cohort-filter'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '@/app/admin/insights/queries'
import {
  getSentimentFunnel,
  getSentimentPayments,
  getSentimentRevenue,
  getSentimentScans,
} from '@/lib/admin/sentiment'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Sentiment Checker — Admin' }

/** The user_events mirror starts 2026-05-20 — "all time" = everything we have. */
const MIRROR_EPOCH = '2026-05-20'

function pctl(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

function money(currency: string, minor: number): string {
  return `${currency === 'INR' ? '₹' : '$'}${(minor / 100).toFixed(2)}`
}

export default async function SentimentAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await withCohort(parseAdminFilters(sp), sp)
  const isAllTime = sp.from === MIRROR_EPOCH && !sp.to

  const [funnel, scans, payments, revenue, countryOptions] = await Promise.all([
    getSentimentFunnel(filters),
    getSentimentScans(filters),
    getSentimentPayments(filters),
    getSentimentRevenue(filters),
    getCountryFilterOptions(),
  ])

  // Scan-health aggregates over the windowed rows (range-only — see lib note).
  const statusMix = scans.reduce<Record<string, number>>((a, s) => ((a[s.status] = (a[s.status] ?? 0) + 1), a), {})
  const durations = scans.map((s) => s.duration_ms ?? 0).filter((d) => d > 0).sort((a, b) => a - b)
  const sourceFreq = scans.reduce<Record<string, number>>((a, s) => {
    for (const src of s.sources ?? []) a[src] = (a[src] ?? 0) + 1
    return a
  }, {})
  const freeScans = scans.filter((s) => s.charge_type === 'free').length
  const paidScans = scans.filter((s) => s.charge_type === 'paid').length
  const paidPayments = revenue.reduce((s, r) => s + r.payments, 0)

  // "All time" preset href — keeps bots + optional filters, swaps the range.
  const allTimeQs = (() => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v)
    params.delete('range')
    params.delete('days')
    params.delete('to')
    params.set('from', MIRROR_EPOCH)
    return `/admin/sentiment?${params.toString()}`
  })()

  const card = 'rounded-lg border border-zinc-800 bg-zinc-900/50 p-4'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <IndianRupee className="h-5 w-5 text-emerald-500" />
          Sentiment &amp; payments
        </h1>
        <div className="flex flex-col items-end gap-1.5">
          <FilterBar
            activeRange={filters.range.key}
            countries={countryOptions}
            eventNames={[...SCHEMA_EVENT_NAMES]}
          />
          <Link
            href={allTimeQs}
            className={`rounded px-2 py-0.5 text-[10px] font-medium border ${
              isAllTime
                ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All time (since {MIRROR_EPOCH} mirror epoch)
          </Link>
        </div>
      </div>

      <p className="mb-6 max-w-3xl text-xs text-zinc-500">
        Paid on-demand sentiment scans — funnel, revenue, and scan health over{' '}
        <span className="text-zinc-300">{isAllTime ? 'all time' : filters.range.label.toLowerCase()}</span>.
        The funnel counts user_events legs ({filters.includeBots ? 'bots included' : 'humans only'}; smart filters apply);
        revenue, scans and payments read their own tables, which have <strong className="text-zinc-400">no bot column</strong> —
        those panels honor the date range only.
      </p>

      {/* ── Funnel ───────────────────────────────────────────────────── */}
      <section className="mb-6">
        <FunnelStrip
          title="Acquisition → revenue funnel"
          steps={funnel.map((f) => ({ label: f.label, value: f.count }))}
          info={<MetricInfo docKey="sentiment_funnel" />}
        />
      </section>

      {/* ── KPI cards ────────────────────────────────────────────────── */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={card}>
          <div className="flex items-center justify-between gap-1">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Revenue (paid)</div>
            <MetricInfo docKey="sentiment_revenue" />
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {revenue.length === 0 ? '—' : revenue.map((r) => money(r.currency, r.amount_minor)).join(' · ')}
          </div>
          <div className="text-[11px] text-zinc-600">{paidPayments} paid payment{paidPayments === 1 ? '' : 's'} in window</div>
        </div>
        <div className={card}>
          <div className="flex items-center justify-between gap-1">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Scans in window</div>
            <MetricInfo docKey="sentiment_scan_health" />
          </div>
          <div className="mt-2 text-lg font-semibold text-white">{scans.length}</div>
          <div className="text-[11px] text-zinc-600">
            {statusMix['ready'] ?? 0} ready · {statusMix['partial'] ?? 0} partial · {statusMix['failed'] ?? 0} failed
          </div>
        </div>
        <div className={card}>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Latency p50 / p95</div>
          <div className="mt-2 text-lg font-semibold text-white">
            {durations.length === 0 ? '—' : `${(pctl(durations, 50) / 1000).toFixed(1)}s / ${(pctl(durations, 95) / 1000).toFixed(1)}s`}
          </div>
          <div className="text-[11px] text-zinc-600">SLA &lt; 45s · over {durations.length} timed scans</div>
        </div>
        <div className={card}>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Free vs paid</div>
          <div className="mt-2 text-lg font-semibold text-white">{freeScans} / {paidScans}</div>
          <div className="text-[11px] text-zinc-600">free / paid scans in window</div>
        </div>
      </section>

      {/* ── Source contribution ──────────────────────────────────────── */}
      <section className={`${card} mb-6`}>
        <h2 className="mb-3 flex items-center gap-1 text-sm font-medium text-zinc-300">
          Source contribution (scans with ≥1 post)
          <MetricInfo docKey="sentiment_scan_health" />
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sourceFreq).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([src, n]) => (
            <span key={src} className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">{src}: {n}</span>
          ))}
          {Object.keys(sourceFreq).length === 0 && <span className="text-xs text-zinc-600">No scans in this window.</span>}
        </div>
      </section>

      {/* ── Recent scans ─────────────────────────────────────────────── */}
      <section className={`${card} mb-6`}>
        <h2 className="mb-3 text-sm font-medium text-zinc-300">Recent scans (window)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-zinc-500">
              <tr className="text-left">
                <th className="py-1 pr-3">Tool</th><th className="pr-3">Status</th><th className="pr-3">Charge</th>
                <th className="pr-3">Sources</th><th className="pr-3">Posts</th><th className="pr-3">Time</th><th>When</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {scans.slice(0, 30).map((s) => (
                <tr key={s.id} className="border-t border-zinc-900">
                  <td className="py-1 pr-3">
                    <Link href={`/admin/insights/tool/${encodeURIComponent(s.tool_slug)}`} className="hover:text-emerald-300">
                      {s.tool_slug}
                    </Link>
                  </td>
                  <td className="pr-3">
                    <span className={s.status === 'ready' ? 'text-emerald-400' : s.status === 'failed' ? 'text-red-400' : 'text-amber-400'}>{s.status}</span>
                  </td>
                  <td className="pr-3">{s.charge_type}</td>
                  <td className="pr-3">{(s.sources ?? []).join(', ') || '—'}</td>
                  <td className="pr-3">{s.mention_count ?? 0}</td>
                  <td className="pr-3">{s.duration_ms ? `${(s.duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                  <td className="text-zinc-600">{new Date(s.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                </tr>
              ))}
              {scans.length === 0 && <tr><td colSpan={7} className="py-3 text-zinc-600">No scans in this window.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Recent payments ──────────────────────────────────────────── */}
      <section className={card}>
        <h2 className="mb-3 flex items-center gap-1 text-sm font-medium text-zinc-300">
          Recent payments (window)
          <MetricInfo docKey="sentiment_revenue" />
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-zinc-500">
              <tr className="text-left"><th className="py-1 pr-3">Gateway</th><th className="pr-3">Amount</th><th className="pr-3">Status</th><th>When</th></tr>
            </thead>
            <tbody className="text-zinc-300">
              {payments.slice(0, 20).map((p) => (
                <tr key={p.id} className="border-t border-zinc-900">
                  <td className="py-1 pr-3">{p.gateway}</td>
                  <td className="pr-3">{money(p.currency, p.amount_minor)}</td>
                  <td className="pr-3">
                    <span className={p.status === 'paid' ? 'text-emerald-400' : p.status === 'failed' ? 'text-red-400' : 'text-zinc-400'}>{p.status}</span>
                  </td>
                  <td className="text-zinc-600">{new Date(p.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4} className="py-3 text-zinc-600">No payments in this window.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
