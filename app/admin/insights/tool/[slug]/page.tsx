// Phase 8.g.7 — per-tool audience snapshot.
// Phase 10.5b.5 (2026-06-12) — re-skinned onto the shared kit: global smart
// filter bar (getToolAudienceDetail converted to AdminFilters; the
// compared-with / unique-visitors RPCs honor p_filters since migration 157),
// shared MetricCard/BarList, ⓘ provenance.

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import { BarList, MetricCard } from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions, getToolAudienceDetail } from '../../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Tool audience — Admin' }

export default async function ToolAudiencePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams
  const filters = parseAdminFilters(sp)

  const [detail, countryOptions] = await Promise.all([
    getToolAudienceDetail(slug, filters),
    getCountryFilterOptions(),
  ])

  // Keep the smart filters on sibling-tool drill-down links.
  const siblingQs = (() => {
    const qsParams = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v) qsParams.set(k, v)
    const s = qsParams.toString()
    return s ? `?${s}` : ''
  })()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/insights/tools${siblingQs}`}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Tool engagement
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-lg font-semibold text-white">
            Tool audience · <span className="text-emerald-400">{slug}</span>
          </h1>
        </div>
        <FilterBar
          activeRange={filters.range.key}
          countries={countryOptions}
          eventNames={[...SCHEMA_EVENT_NAMES]}
        />
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        Vendor pitch in one screen: usage, intent-to-purchase signal, brand-adjacency —
        over {filters.range.label.toLowerCase()}, {filters.includeBots ? 'bots included' : 'humans only'}.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Unique users" value={detail.unique_users} info={<MetricInfo docKey="tool_audience" />} />
        <MetricCard label="Page views" value={detail.views} />
        <MetricCard label="Click-outs (affiliate)" value={detail.click_outs} />
        <MetricCard label="Saves" value={detail.saves} />
      </div>

      <div className="mt-6">
        <BarList
          title="Most-compared against this tool"
          rows={detail.compared_with}
          emptyHint="No comparisons including this tool yet"
          rowHrefBuilder={(s) => `/admin/insights/tool/${encodeURIComponent(s)}${siblingQs}`}
          info={<MetricInfo docKey="tool_audience" />}
        />
      </div>

      <div className="mt-8 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-4 text-xs">
        <div className="mb-1 font-medium text-emerald-300">Vendor pitch snippet</div>
        <p className="text-zinc-300">
          In the last {filters.range.days} days, <span className="font-mono text-emerald-200">{slug}</span> reached{' '}
          <span className="font-semibold text-white">{detail.unique_users.toLocaleString()}</span> unique high-intent
          users on RightAIChoice, with{' '}
          <span className="font-semibold text-white">{detail.views.toLocaleString()}</span> page views,{' '}
          <span className="font-semibold text-white">{detail.click_outs.toLocaleString()}</span> click-throughs to your
          site, and <span className="font-semibold text-white">{detail.saves.toLocaleString()}</span> bookmarks.
          {detail.compared_with.length > 0 && (
            <>
              {' '}Top alternatives users compare with you:{' '}
              <span className="text-zinc-400">{detail.compared_with.slice(0, 5).map((r) => r.label).join(', ')}</span>.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
