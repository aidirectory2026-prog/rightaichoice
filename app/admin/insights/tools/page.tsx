// Tool engagement heatmap.
// Phase 10.5b.5 (2026-06-12) — re-skinned onto the shared kit: global smart
// filter bar (query moved to queries.ts getToolHeatmap, now passing explicit
// p_cutoff/p_end so calendar-anchored ranges are honest, plus p_filters from
// migration 157), MetricCard KPI strip, ⓘ provenance.

import Link from 'next/link'
import { ArrowUpRight, ExternalLink, Search, Wrench } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import { MetricCard, fmt } from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { withCohort } from '@/lib/admin/cohort-filter'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { relativeTime } from '../_ui/primitives'
import { getCountryFilterOptions, getToolHeatmap } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Tool engagement — Admin' }

// Heat colour for CTR cell — green at high CTR, amber mid, red low.
function ctrCellClass(ctr: number, hasClicks: boolean): string {
  if (!hasClicks) return 'text-zinc-600'
  if (ctr >= 10) return 'bg-emerald-900/50 text-emerald-300'
  if (ctr >= 3) return 'bg-amber-900/40 text-amber-300'
  return 'bg-rose-900/30 text-rose-300'
}

function viewsBgClass(views: number, max: number): string {
  if (max === 0) return ''
  const ratio = views / max
  if (ratio > 0.75) return 'bg-emerald-900/40'
  if (ratio > 0.5) return 'bg-emerald-900/30'
  if (ratio > 0.25) return 'bg-emerald-900/20'
  if (ratio > 0.1) return 'bg-emerald-900/10'
  return ''
}

export default async function ToolsHeatmapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await withCohort(parseAdminFilters(sp), sp)
  const q = (sp.q ?? '').trim()

  const [allRows, countryOptions] = await Promise.all([
    getToolHeatmap(filters),
    getCountryFilterOptions(),
  ])
  const rows = q
    ? allRows.filter((r) => {
        const qLower = q.toLowerCase()
        return r.tool_slug.toLowerCase().includes(qLower) || (r.tool_name?.toLowerCase().includes(qLower) ?? false)
      })
    : allRows

  const totalViews = rows.reduce((s, r) => s + r.views, 0)
  const totalClicks = rows.reduce((s, r) => s + r.visit_clicks, 0)
  const totalVisitors = rows.reduce((s, r) => s + r.unique_visitors, 0)
  const overallCtr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0
  const maxViews = Math.max(...rows.map((r) => r.views), 1)

  // Keep the smart filters on every drill-down link.
  const detailQs = (() => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v && k !== 'q') params.set(k, v)
    const s = params.toString()
    return s ? `?${s}` : ''
  })()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Wrench className="h-5 w-5 text-emerald-500" />
          Tool engagement
        </h1>
        <div className="flex flex-col items-end gap-1.5">
          <FilterBar
            activeRange={filters.range.key}
            countries={countryOptions}
            eventNames={[...SCHEMA_EVENT_NAMES]}
          />
          <form className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search tools… ⏎"
              className="rounded-md border border-zinc-800 bg-zinc-950 pl-7 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:border-emerald-700 focus:outline-none w-56"
            />
            {Object.entries(sp)
              .filter(([k, v]) => v && k !== 'q')
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
          </form>
        </div>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        Views, visitors, click-through per tool over {filters.range.label.toLowerCase()},{' '}
        {filters.includeBots ? 'bots included' : 'humans only'}. Click a tool to drill into its audience.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Tools with traffic" value={rows.length} info={<MetricInfo docKey="tools_heatmap" />} />
        <MetricCard label="Total views" value={totalViews} />
        <MetricCard label="Unique visitors" value={totalVisitors} />
        <MetricCard label="Overall CTR" value={Math.round(overallCtr * 10) / 10} suffix="%" />
      </div>

      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center gap-1">
          <div className="text-sm font-medium text-zinc-300">
            {rows.length} tools{q ? ` matching "${q}"` : ''}
          </div>
          <MetricInfo docKey="tools_heatmap" />
        </div>
        {rows.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No tool traffic in this window — try a wider range or check that tool_page_viewed is firing.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-2 text-left font-medium">Tool</th>
                  <th className="px-4 py-2 text-right font-medium">Views</th>
                  <th className="px-4 py-2 text-right font-medium">Visitors</th>
                  <th className="px-4 py-2 text-right font-medium">Clicks</th>
                  <th className="px-4 py-2 text-right font-medium">CTR</th>
                  <th className="px-4 py-2 text-right font-medium">Last visit</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/80">
                {rows.map((r) => (
                  <tr key={r.tool_slug} className="hover:bg-zinc-900/30">
                    <td className="px-4 py-2">
                      <Link
                        href={`/admin/insights/tool/${encodeURIComponent(r.tool_slug)}${detailQs}`}
                        className="text-zinc-200 hover:text-emerald-400 font-medium"
                      >
                        {r.tool_name ?? r.tool_slug}
                      </Link>
                      <div className="text-[10px] text-zinc-600 font-mono">{r.tool_slug}</div>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono tabular-nums ${viewsBgClass(r.views, maxViews)}`}>
                      {fmt(r.views)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-400 tabular-nums">{fmt(r.unique_visitors)}</td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-400 tabular-nums">{fmt(r.visit_clicks)}</td>
                    <td className={`px-4 py-2 text-right font-mono tabular-nums rounded-l-sm ${ctrCellClass(r.ctr_pct, r.visit_clicks > 0)}`}>
                      {r.ctr_pct}%
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500">{relativeTime(r.last_visit_at)}</td>
                    <td className="px-4 py-2 flex items-center gap-1">
                      <Link
                        href={`/tools/${r.tool_slug}`}
                        target="_blank"
                        className="text-zinc-500 hover:text-zinc-300"
                        title="Open live tool page"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <Link
                        href={`/admin/insights/tool/${encodeURIComponent(r.tool_slug)}${detailQs}`}
                        className="text-zinc-500 hover:text-emerald-400"
                      >
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
