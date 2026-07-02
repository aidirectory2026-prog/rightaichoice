// Phase 14b Wave 4 — Paths (/admin/insights/paths). "What do people do after
// X?" — session-scoped event→event transitions via insights_event_paths
// (migration 187, 30-min-gap sessions like Explore). Pick an anchor event,
// walk forward or backward up to 4 steps; click any event in the tree to
// re-anchor on it. All clicking, no query language; the global FilterBar
// (geo/device/…/cohort/person) scopes everything.

import Link from 'next/link'
import { Route } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { filtersToJsonb, type AdminFilters } from '@/lib/admin/filters'
import { resolveServerFilters } from '@/lib/admin/resolve-filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '../queries'
import { PathControls } from './path-controls'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Paths — Admin' }

type PathRow = { depth: number; from_event: string; to_event: string; transitions: number; visitors: number }

async function getPaths(
  f: AdminFilters,
  opts: { anchor: string | null; direction: 'after' | 'before' },
): Promise<PathRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).rpc('insights_event_paths', {
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO ?? new Date().toISOString(),
    p_include_bots: f.includeBots,
    p_filters: filtersToJsonb(f),
    p_anchor: opts.anchor,
    p_direction: opts.direction,
    p_depth: 4,
    p_limit: 12,
  })
  if (error) throw new Error(`insights_event_paths failed: ${error.message}`)
  return ((data ?? []) as PathRow[]).map((r) => ({
    ...r,
    depth: Number(r.depth),
    transitions: Number(r.transitions),
    visitors: Number(r.visitors),
  }))
}

const cleanEvent = (v: string | undefined) => {
  const s = (v ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  return s || null
}

export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await resolveServerFilters(sp)
  const anchor = cleanEvent(sp.anchor)
  const direction: 'after' | 'before' = sp.dir === 'before' ? 'before' : 'after'

  const [rows, countryOptions] = await Promise.all([
    getPaths(filters, { anchor, direction }),
    getCountryFilterOptions(),
  ])

  const depths = [...new Set(rows.map((r) => r.depth))].sort((a, b) => a - b)
  const atDepth = (d: number) => rows.filter((r) => r.depth === d).sort((a, b) => b.transitions - a.transitions).slice(0, 10)

  /** Re-anchor link keeping every filter param. */
  const anchorHref = (ev: string) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v) p.set(k, v)
    p.set('anchor', ev)
    return `/admin/insights/paths?${p.toString()}`
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Route className="h-5 w-5 text-emerald-500" />
          Paths
        </h1>
        <FilterBar activeRange={filters.range.key} countries={countryOptions} eventNames={[...SCHEMA_EVENT_NAMES]} />
      </div>

      <p className="mb-4 max-w-3xl text-xs text-zinc-500">
        What people do <strong className="text-zinc-300">{direction === 'after' ? 'after' : 'before'}</strong>{' '}
        {anchor ? <code className="text-emerald-300">{anchor}</code> : 'their session starts'} — step by step within a
        session (30-minute idle gap). Click any event box to re-anchor the tree on it.
      </p>

      <div className="mb-4">
        <PathControls anchor={anchor} direction={direction} eventNames={[...SCHEMA_EVENT_NAMES]} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-10 text-center text-xs text-zinc-500">
          No sessions match — widen the range, clear filters, or pick a more common anchor event.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {depths.map((d) => (
            <div key={d} className="min-w-[240px] flex-1">
              <div className="mb-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
                {direction === 'after' ? `Step +${d}` : `Step −${d}`}
              </div>
              <div className="space-y-1.5">
                {atDepth(d).map((r) => (
                  <Link
                    key={`${r.from_event}→${r.to_event}`}
                    href={anchorHref(r.to_event)}
                    className="block rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-1.5 hover:border-emerald-700 transition-colors"
                    title={`from ${r.from_event} — click to re-anchor on ${r.to_event}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[11px] text-zinc-200">{r.to_event}</span>
                      <span className="shrink-0 font-mono tabular-nums text-[11px] text-emerald-300">{r.visitors.toLocaleString()}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-zinc-600">
                      <span className="truncate">← {r.from_event}</span>
                      <span className="shrink-0">{r.transitions.toLocaleString()}×</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-zinc-600">
        Numbers are unique visitors (green) and raw transitions (grey). Steps count events, so background events
        (scroll depth, heartbeats) appear too — filter them out with an event ≠ chip above if they drown the signal.
      </p>
    </div>
  )
}
