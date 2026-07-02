// Phase 14b Wave 4 — Retention (/admin/insights/retention). "Do people come
// back?" — classic Mixpanel cohort grid via insights_retention (migration 187):
// each row is the cohort of visitors whose FIRST qualifying event fell in that
// IST week/day; each cell is how many of them did a qualifying event N periods
// later. Anchor/return events and day/week granularity are URL state; the
// global FilterBar (geo/device/…/cohort/person) applies to the whole grid.

import { Repeat } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { filtersToJsonb, type AdminFilters } from '@/lib/admin/filters'
import { resolveServerFilters } from '@/lib/admin/resolve-filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '../queries'
import { RetentionControls } from './retention-controls'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Retention — Admin' }

type RetentionRow = { cohort_start: string; cohort_size: number; period_index: number; retained: number }

async function getRetention(
  f: AdminFilters,
  opts: { firstEvent: string | null; returnEvent: string | null; period: 'day' | 'week' },
): Promise<RetentionRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).rpc('insights_retention', {
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO ?? new Date().toISOString(),
    p_include_bots: f.includeBots,
    p_filters: filtersToJsonb(f),
    p_first_event: opts.firstEvent,
    p_return_event: opts.returnEvent,
    p_period: opts.period,
  })
  if (error) throw new Error(`insights_retention failed: ${error.message}`)
  return ((data ?? []) as RetentionRow[]).map((r) => ({
    ...r,
    cohort_size: Number(r.cohort_size),
    period_index: Number(r.period_index),
    retained: Number(r.retained),
  }))
}

const cleanEvent = (v: string | undefined) => {
  const s = (v ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  return s || null
}

/** Heat shade for a retention % (0..100). */
function shade(pct: number): string {
  if (pct >= 60) return 'bg-emerald-600/70 text-white'
  if (pct >= 40) return 'bg-emerald-700/60 text-emerald-100'
  if (pct >= 25) return 'bg-emerald-800/50 text-emerald-200'
  if (pct >= 10) return 'bg-emerald-900/40 text-emerald-300'
  if (pct > 0) return 'bg-emerald-950/40 text-emerald-400'
  return 'bg-zinc-900/40 text-zinc-600'
}

export default async function RetentionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await resolveServerFilters(sp)
  const period: 'day' | 'week' = sp.period === 'day' ? 'day' : 'week'
  const firstEvent = cleanEvent(sp.first)
  const returnEvent = cleanEvent(sp.return)

  const [rows, countryOptions] = await Promise.all([
    getRetention(filters, { firstEvent, returnEvent, period }),
    getCountryFilterOptions(),
  ])

  const cohorts = [...new Set(rows.map((r) => r.cohort_start))].sort()
  const maxPeriod = rows.reduce((m, r) => Math.max(m, r.period_index), 0)
  const cell = (c: string, p: number) => rows.find((r) => r.cohort_start === c && r.period_index === p)
  const sizeOf = (c: string) => rows.find((r) => r.cohort_start === c)?.cohort_size ?? 0

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Repeat className="h-5 w-5 text-emerald-500" />
          Retention
        </h1>
        <FilterBar activeRange={filters.range.key} countries={countryOptions} eventNames={[...SCHEMA_EVENT_NAMES]} />
      </div>

      <p className="mb-4 max-w-3xl text-xs text-zinc-500">
        Each row is the group of visitors whose <strong className="text-zinc-300">first
        {firstEvent ? ` ${firstEvent}` : ' visit'}</strong> fell in that {period}; each cell shows how many of them
        came back{returnEvent ? ` and did ${returnEvent}` : ''} N {period}s later. {period === 'week' ? 'Weeks' : 'Days'} are
        IST-anchored. The filters above scope the whole grid.
      </p>

      <div className="mb-4">
        <RetentionControls period={period} firstEvent={firstEvent} returnEvent={returnEvent} eventNames={[...SCHEMA_EVENT_NAMES]} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900/60 text-left text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Cohort ({period} of first {firstEvent ?? 'visit'})</th>
              <th className="px-3 py-2 text-right font-medium">People</th>
              {Array.from({ length: maxPeriod + 1 }, (_, p) => (
                <th key={p} className="px-2 py-2 text-center font-medium">{period === 'week' ? `W${p}` : `D${p}`}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80">
            {cohorts.length === 0 ? (
              <tr>
                <td colSpan={maxPeriod + 3} className="px-3 py-8 text-center text-zinc-500">
                  No qualifying visitors in this window — widen the date range or clear filters.
                </td>
              </tr>
            ) : (
              cohorts.map((c) => {
                const size = sizeOf(c)
                return (
                  <tr key={c}>
                    <td className="whitespace-nowrap px-3 py-1.5 text-zinc-300">{c}</td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-zinc-400">{size.toLocaleString()}</td>
                    {Array.from({ length: maxPeriod + 1 }, (_, p) => {
                      const r = cell(c, p)
                      if (!r) return <td key={p} className="px-1 py-1" />
                      const pct = size > 0 ? Math.round((r.retained / size) * 100) : 0
                      return (
                        <td key={p} className="px-1 py-1 text-center">
                          <span
                            className={`inline-block min-w-[44px] rounded px-1.5 py-1 font-mono tabular-nums ${shade(pct)}`}
                            title={`${r.retained.toLocaleString()} of ${size.toLocaleString()} (${pct}%)`}
                          >
                            {pct}%
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-zinc-600">
        Counted per browser ID (a returning visitor on a new device shows as new). {period === 'week' ? 'W0' : 'D0'} is
        the cohort {period} itself, so it reads 100% unless a return event different from the anchor is set.
      </p>
    </div>
  )
}
