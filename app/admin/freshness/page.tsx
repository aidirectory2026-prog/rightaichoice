import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader } from '@/components/admin/page-header'
import { MetricInfo } from '@/components/admin/metric-info'
import { SortableHeader } from '@/components/admin/sortable-header'
import { MultiSelectFilter } from '@/components/admin/multi-select-filter'
import { parseSort, sortRows } from '@/lib/admin/sort'

// Oldest-tool table sort key → field (age uses a computed seconds field).
const OLDEST_SORT = { age: '_ageSec', field: 'field', pricing: 'pricing_type' } as const
type OldestSortKey = keyof typeof OLDEST_SORT
const listParam = (v: string | undefined): string[] => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)

// Phase 8.d.8 — heatmap of field freshness across the published catalog.
// Backed by v_field_freshness materialized view (refreshed nightly by
// /api/cron/refresh-freshness-view).
//
// Phase 10.5c.2 (2026-06-12) — re-skinned onto the shared admin kit
// (PageHeader breadcrumb, ⓘ provenance). Data + query semantics unchanged.
// Not date-ranged: the materialized view always reflects its last nightly
// refresh, so the global filter bar does not apply — stated below.

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Freshness — Admin' }

type Row = {
  field: string
  pricing_type: string
  total_tools: number
  count_never_filled: number
  count_stale_30d: number
  count_stale_7d: number
  p50_age_sec: number | null
  p95_age_sec: number | null
  oldest_slug: string | null
  oldest_ts: string | null
}

const FIELD_LABEL: Record<string, string> = {
  last_verified_at: 'Last verified (Phase 4 SOP)',
  last_full_refresh_at: 'Last full refresh',
  latest_updates_at: '“Latest from” feed',
  viability_updated_at: 'Viability score',
  our_views_generated_at: 'View count seed',
}

function daysFromSec(sec: number | null): number | null {
  if (sec == null) return null
  return Math.round(sec / 86_400)
}

function tone(p95Days: number | null): string {
  if (p95Days == null) return 'bg-zinc-900/40'
  if (p95Days < 7) return 'bg-emerald-950/40 border-emerald-800/40'
  if (p95Days < 30) return 'bg-amber-950/40 border-amber-800/40'
  return 'bg-rose-950/40 border-rose-800/40'
}

function p95Label(p95Days: number | null): string {
  if (p95Days == null) return '—'
  return `${p95Days}d`
}

export default async function FreshnessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const fieldSel = listParam(sp.field)
  const pricingSel = listParam(sp.pricing)
  const sort = parseSort<OldestSortKey>(sp, Object.keys(OLDEST_SORT) as OldestSortKey[], { key: 'age', dir: 'desc' })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('v_field_freshness')
    .select('*')
    .order('field')
    .order('pricing_type')

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Freshness</h1>
        <p className="text-sm text-rose-400">
          v_field_freshness materialized view not found — apply migrations 091 + 091a first.
        </p>
      </div>
    )
  }

  const allRows = (data ?? []) as Row[]
  // All fields/pricing tiers for the filter option lists (before narrowing).
  const allFields = Array.from(new Set(allRows.map((r) => r.field)))
  const allPricing = Array.from(new Set(allRows.map((r) => r.pricing_type))).sort()
  // Phase 14 — narrow the whole view (summary + heatmap + oldest table).
  let rows = allRows
  if (fieldSel.length) rows = rows.filter((r) => fieldSel.includes(r.field))
  if (pricingSel.length) rows = rows.filter((r) => pricingSel.includes(r.pricing_type))
  const fields = Array.from(new Set(rows.map((r) => r.field)))
  const pricingTypes = Array.from(new Set(rows.map((r) => r.pricing_type))).sort()

  // Per-field totals across pricing tiers — for the "summary" row.
  const fieldTotals = fields.map((field) => {
    const fieldRows = rows.filter((r) => r.field === field)
    const total = fieldRows.reduce((s, r) => s + r.total_tools, 0)
    const never = fieldRows.reduce((s, r) => s + r.count_never_filled, 0)
    const stale30 = fieldRows.reduce((s, r) => s + r.count_stale_30d, 0)
    const stale7 = fieldRows.reduce((s, r) => s + r.count_stale_7d, 0)
    return { field, total, never, stale30, stale7 }
  })

  return (
    <div>
      <PageHeader>
        <Link href="/admin/updates" className="text-xs text-zinc-500 hover:text-emerald-300">
          ← Knowledge Room
        </Link>
      </PageHeader>
      <p className="mb-6 -mt-2 max-w-3xl text-xs text-zinc-500">
        Per-field × pricing-tier age distribution across published tools — tells you what to refresh
        next. Reads the v_field_freshness materialized view (refreshed nightly, not date-ranged — the
        global filter does not apply here).
      </p>

      {/* Phase 14 — focus filters (narrow the summary, heatmap and oldest table) */}
      <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
        <MultiSelectFilter
          label="Field"
          param="field"
          options={allFields.map((f) => ({ value: f, label: FIELD_LABEL[f] ?? f }))}
        />
        <MultiSelectFilter label="Pricing" param="pricing" options={allPricing.map((p) => ({ value: p }))} />
      </div>

      {/* ── Summary table ───────────────────────────────────────── */}
      <h2 className="mb-3 flex items-center gap-1 text-sm font-semibold text-white">
        Per-field summary
        <MetricInfo docKey="freshness_field_map" align="left" />
      </h2>
      <div className="mb-8 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-xs text-zinc-400">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Field</th>
              <th className="text-right px-3 py-2 font-medium">Total tools</th>
              <th className="text-right px-3 py-2 font-medium">Never filled</th>
              <th className="text-right px-3 py-2 font-medium">Stale &gt;7d</th>
              <th className="text-right px-3 py-2 font-medium">Stale &gt;30d</th>
            </tr>
          </thead>
          <tbody>
            {fieldTotals.map((t) => (
              <tr key={t.field} className="border-t border-zinc-800/60">
                <td className="px-3 py-2 text-zinc-200">
                  {FIELD_LABEL[t.field] ?? t.field}
                  <span className="block text-[10px] text-zinc-600">{t.field}</span>
                </td>
                <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">{t.total.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${t.never > 0 ? 'text-rose-300' : 'text-zinc-500'}`}>
                  {t.never.toLocaleString()}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${t.stale7 > t.total / 2 ? 'text-amber-300' : 'text-zinc-500'}`}>
                  {t.stale7.toLocaleString()}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${t.stale30 > 0 ? 'text-rose-300' : 'text-zinc-500'}`}>
                  {t.stale30.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Heatmap (p95 age in days, field × pricing_type) ───── */}
      <h2 className="text-sm font-semibold text-white mb-3">p95 age (days) — heatmap</h2>
      <div className="rounded-lg border border-zinc-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Field</th>
              {pricingTypes.map((pt) => (
                <th key={pt} className="text-center px-3 py-2 font-medium capitalize">
                  {pt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field} className="border-t border-zinc-800/60">
                <td className="px-3 py-2 text-zinc-200 font-medium">
                  {FIELD_LABEL[field] ?? field}
                </td>
                {pricingTypes.map((pt) => {
                  const row = rows.find((r) => r.field === field && r.pricing_type === pt)
                  const p95d = daysFromSec(row?.p95_age_sec ?? null)
                  return (
                    <td key={pt} className="p-1">
                      <div
                        className={`rounded border px-2 py-1.5 text-center ${tone(p95d)}`}
                        title={
                          row
                            ? `${row.total_tools} tools · ${row.count_never_filled} never filled · p50=${daysFromSec(row.p50_age_sec) ?? '—'}d · p95=${p95Label(p95d)}`
                            : 'no data'
                        }
                      >
                        <div className="text-sm font-semibold text-zinc-100">{p95Label(p95d)}</div>
                        {row && row.count_never_filled > 0 && (
                          <div className="text-[10px] text-rose-300 mt-0.5">
                            {row.count_never_filled} never
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Oldest tool per (field × pricing_type) ──────────────── */}
      <h2 className="text-sm font-semibold text-white mb-3 mt-8">Oldest tool per (field × pricing)</h2>
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900/60 text-zinc-400">
            <tr>
              <th className="text-left px-3 py-2 font-medium"><SortableHeader label="Field" sortKey="field" firstDir="asc" /></th>
              <th className="text-left px-3 py-2 font-medium"><SortableHeader label="Pricing" sortKey="pricing" firstDir="asc" /></th>
              <th className="text-left px-3 py-2 font-medium">Oldest tool</th>
              <th className="text-right px-3 py-2 font-medium"><SortableHeader label="Age" sortKey="age" align="right" /></th>
            </tr>
          </thead>
          <tbody>
            {sortRows(
              rows
                .filter((r) => r.oldest_slug)
                .map((r) => ({ ...r, _ageSec: r.oldest_ts ? Date.now() - new Date(r.oldest_ts).getTime() : -1 })),
              OLDEST_SORT[sort.key],
              sort.dir,
            )
              .slice(0, 24)
              .map((r) => {
                const ageDays = r.oldest_ts
                  ? Math.round((Date.now() - new Date(r.oldest_ts).getTime()) / 86_400_000)
                  : null
                return (
                  <tr key={`${r.field}-${r.pricing_type}`} className="border-t border-zinc-800/60 hover:bg-zinc-900/30">
                    <td className="px-3 py-2 text-zinc-300">{FIELD_LABEL[r.field] ?? r.field}</td>
                    <td className="px-3 py-2 text-zinc-500 capitalize">{r.pricing_type}</td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/tools/${r.oldest_slug}`}
                        target="_blank"
                        className="text-zinc-200 hover:text-emerald-300"
                      >
                        {r.oldest_slug}
                      </Link>
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums ${
                      ageDays != null && ageDays > 30 ? 'text-rose-300' : ageDays != null && ageDays > 7 ? 'text-amber-300' : 'text-zinc-500'
                    }`}>
                      {ageDays != null ? `${ageDays}d` : '—'}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
