// Phase 14 Wave 3 — Explore: session-level breakdowns + a cross-tab pivot.
// Both honour the global filter bar (range + bots + every dimension + a pinned
// cohort) via the shared predicate. Session grouping is 30-min-gap per visitor
// (insights_session_breakdown); the pivot is a 2-dimension cross-tab
// (insights_breakdown_matrix), migration 182.

import Link from 'next/link'
import { BarChart3, ChevronLeft, Compass } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { fmt } from '@/components/admin/charts'
import { filtersToJsonb } from '@/lib/admin/filters'
import { resolveServerFilters } from '@/lib/admin/resolve-filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Explore — Admin' }

const SESSION_DIMS = [
  { k: 'country', label: 'Country' },
  { k: 'device', label: 'Device' },
  { k: 'auth', label: 'Auth' },
] as const
const PIVOT_DIMS = [
  { k: 'country', label: 'Country' },
  { k: 'device', label: 'Device' },
  { k: 'event', label: 'Event' },
  { k: 'auth', label: 'Auth' },
] as const
const COL_CAP = 12
const ROW_CAP = 25

type SessRow = { key: string; sessions: number; visitors: number; events: number }
type MatrixRow = { d1: string; d2: string; events: number; visitors: number }

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await resolveServerFilters(sp)
  const sel = filters.range
  const fj = filtersToJsonb(filters)

  const sdim = SESSION_DIMS.some((d) => d.k === sp.sdim) ? (sp.sdim as string) : 'country'
  const pdim1 = PIVOT_DIMS.some((d) => d.k === sp.pdim1) ? (sp.pdim1 as string) : 'country'
  const pdim2 = PIVOT_DIMS.some((d) => d.k === sp.pdim2) ? (sp.pdim2 as string) : 'device'
  const pmetric: 'events' | 'visitors' = sp.pmetric === 'visitors' ? 'visitors' : 'events'

  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyDb = db as any
  const [sessRes, matrixRes, countryOptions] = await Promise.all([
    anyDb.rpc('insights_session_breakdown', {
      p_cutoff: sel.cutoffISO, p_end: sel.endCutoffISO, p_include_bots: filters.includeBots,
      p_filters: fj, p_dimension: sdim, p_gap_min: 30, p_limit: 100,
    }),
    anyDb.rpc('insights_breakdown_matrix', {
      p_cutoff: sel.cutoffISO, p_end: sel.endCutoffISO, p_include_bots: filters.includeBots,
      p_filters: fj, p_dim1: pdim1, p_dim2: pdim2, p_limit: 400,
    }),
    getCountryFilterOptions(),
  ])
  const sessions = (sessRes.data ?? []) as SessRow[]
  const matrix = (matrixRes.data ?? []) as MatrixRow[]
  const totalSessions = sessions.reduce((s, r) => s + Number(r.sessions), 0)
  const maxSessions = Math.max(1, ...sessions.map((r) => Number(r.sessions)))

  // Pivot shape: distinct d1 (rows) × d2 (cols), capped, with a lookup.
  const colTotals = new Map<string, number>()
  for (const m of matrix) colTotals.set(m.d2, (colTotals.get(m.d2) ?? 0) + Number(m[pmetric]))
  const cols = [...colTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, COL_CAP).map(([c]) => c)
  const rowTotals = new Map<string, number>()
  for (const m of matrix) rowTotals.set(m.d1, (rowTotals.get(m.d1) ?? 0) + Number(m[pmetric]))
  const rowKeys = [...rowTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, ROW_CAP).map(([r]) => r)
  const cell = new Map<string, number>()
  for (const m of matrix) cell.set(`${m.d1}|${m.d2}`, Number(m[pmetric]))
  const maxCell = Math.max(1, ...matrix.map((m) => Number(m[pmetric])))

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v) p.set(k, v)
    for (const [k, v] of Object.entries(over)) p.set(k, v)
    return `/admin/insights/explore?${p.toString()}`
  }

  const pill = (active: boolean) =>
    `rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
      active ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
    }`

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Compass className="h-5 w-5 text-emerald-500" />
            Explore
          </h1>
        </div>
        <FilterBar activeRange={sel.key} countries={countryOptions} eventNames={[...SCHEMA_EVENT_NAMES]} />
      </div>
      <p className="mb-6 max-w-3xl text-xs text-zinc-500">
        Session-level and cross-tab views. Everything here honours the filter bar above — including a pinned
        cohort — so you can ask &ldquo;the geo of sessions from logged-in mobile users&rdquo; or pivot any two
        dimensions against each other. Sessions group a visitor&rsquo;s events with a 30-minute idle gap.
      </p>

      {/* ── Sessions by dimension ─────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Sessions by</h2>
          {SESSION_DIMS.map((d) => (
            <Link key={d.k} href={qs({ sdim: d.k })} className={pill(sdim === d.k)}>{d.label}</Link>
          ))}
          <span className="ml-2 text-xs text-zinc-500">{fmt(totalSessions)} sessions in window</span>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-[11px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{SESSION_DIMS.find((d) => d.k === sdim)?.label}</th>
                <th className="px-3 py-2 text-right font-medium">Sessions</th>
                <th className="px-3 py-2 text-right font-medium">Visitors</th>
                <th className="px-3 py-2 text-right font-medium">Events</th>
                <th className="px-3 py-2 text-left font-medium w-1/3">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {sessions.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-500">No sessions match these filters.</td></tr>
              ) : (
                sessions.map((r) => (
                  <tr key={r.key} className="text-zinc-300 hover:bg-zinc-900/30">
                    <td className="px-3 py-2 font-medium text-zinc-200">{r.key}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(r.sessions)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{fmt(r.visitors)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-500">{fmt(r.events)}</td>
                    <td className="px-3 py-2">
                      <div className="h-2 rounded-full bg-emerald-700/70" style={{ width: `${Math.max(2, (Number(r.sessions) / maxSessions) * 100)}%` }} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pivot (dim × dim) ─────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-white">Pivot</h2>
          <span className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Rows</span>
            {PIVOT_DIMS.filter((d) => d.k !== pdim2).map((d) => (
              <Link key={d.k} href={qs({ pdim1: d.k })} className={pill(pdim1 === d.k)}>{d.label}</Link>
            ))}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Cols</span>
            {PIVOT_DIMS.filter((d) => d.k !== pdim1).map((d) => (
              <Link key={d.k} href={qs({ pdim2: d.k })} className={pill(pdim2 === d.k)}>{d.label}</Link>
            ))}
          </span>
          <span className="flex items-center gap-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Metric</span>
            <Link href={qs({ pmetric: 'events' })} className={pill(pmetric === 'events')}>Events</Link>
            <Link href={qs({ pmetric: 'visitors' })} className={pill(pmetric === 'visitors')}>Visitors</Link>
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/60 text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium sticky left-0 bg-zinc-900/60">{PIVOT_DIMS.find((d) => d.k === pdim1)?.label} ╲ {PIVOT_DIMS.find((d) => d.k === pdim2)?.label}</th>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-2 text-right font-medium whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {rowKeys.length === 0 ? (
                <tr><td colSpan={cols.length + 1} className="px-3 py-8 text-center text-zinc-500">No data for this pivot + filters.</td></tr>
              ) : (
                rowKeys.map((rk) => (
                  <tr key={rk}>
                    <td className="px-3 py-2 font-medium text-zinc-200 sticky left-0 bg-zinc-900/40 whitespace-nowrap">{rk}</td>
                    {cols.map((c) => {
                      const v = cell.get(`${rk}|${c}`) ?? 0
                      const intensity = v / maxCell
                      return (
                        <td key={c} className="px-3 py-2 text-right tabular-nums" style={{ backgroundColor: v ? `rgba(16,185,129,${0.06 + intensity * 0.4})` : undefined }}>
                          <span className={v ? 'text-zinc-100' : 'text-zinc-700'}>{v ? fmt(v) : '·'}</span>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-zinc-600">Cell = {pmetric} where row &amp; column both apply. Top {ROW_CAP} rows × top {COL_CAP} columns by total. Darker = higher.</p>
      </div>
    </div>
  )
}
