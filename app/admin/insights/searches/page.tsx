// Phase 10 (Traffic Analysis Upgrade) — Searches. Every search a visitor ran,
// the text they typed, who they are, when, how many results, and whether they
// clicked one — so the owner can see exactly WHICH USER SEARCHED WHAT and spot
// zero-result queries the catalog can't answer. Powered by insights_search_log
// (migration 162). Admin-only (service_role).

import Link from 'next/link'
import { ChevronLeft, Search } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricCard } from '@/components/admin/charts'
import { parseAdminFilters, type AdminFilters } from '@/lib/admin/filters'
import { withCohort } from '@/lib/admin/cohort-filter'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Searches — Admin' }

type SearchRow = {
  distinct_id: string
  user_id: string | null
  email: string | null
  query: string
  event_kind: string
  result_count: number | null
  zero_result: boolean | null
  clicked: boolean
  created_at: string
}

async function getSearchLog(f: AdminFilters): Promise<SearchRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any).rpc('insights_search_log', {
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    p_include_bots: f.includeBots,
    p_limit: 300,
  })
  return (data ?? []) as SearchRow[]
}

function when(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default async function SearchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await withCohort(parseAdminFilters(sp), sp)
  const [rows, countryOptions] = await Promise.all([getSearchLog(filters), getCountryFilterOptions()])

  const total = rows.length
  const searchers = new Set(rows.map((r) => r.distinct_id)).size
  const submitted = rows.filter((r) => r.event_kind !== 'typed')
  const zero = submitted.filter((r) => r.zero_result).length
  const zeroRate = submitted.length > 0 ? Math.round((zero / submitted.length) * 1000) / 10 : 0

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Search className="h-5 w-5 text-emerald-500" />
            Searches
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/admin/export?type=searches&days=30" className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-900">Export CSV</a>
          <FilterBar activeRange={filters.range.key} countries={countryOptions} eventNames={[...SCHEMA_EVENT_NAMES]} />
        </div>
      </div>

      <p className="mb-4 max-w-3xl text-xs text-zinc-500">
        Every search run in this window — the exact text, who searched it, and whether it returned anything.
        A high <strong className="text-amber-300">zero-result</strong> rate means people are asking for things the
        catalog can&apos;t answer. Click a row for that visitor&apos;s full timeline.
      </p>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <MetricCard label="Searches" value={total} kind="events" />
        <MetricCard label="Searchers" value={searchers} kind="people" />
        <MetricCard label="Zero-result rate" value={zeroRate} suffix="%" extra={<span className="text-[10px] text-zinc-600">{zero} of {submitted.length} submitted</span>} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Query</th>
              <th className="px-3 py-2 font-medium">Who</th>
              <th className="px-3 py-2 font-medium">Results</th>
              <th className="px-3 py-2 font-medium">Clicked</th>
              <th className="px-3 py-2 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">No searches in this window.</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.distinct_id}-${i}`} className="hover:bg-zinc-900/40">
                  <td className="max-w-[360px] px-3 py-2 text-zinc-200" title={r.query}>
                    <span className="line-clamp-2">“{r.query}”</span>
                    {r.event_kind === 'typed' ? <span className="ml-1 text-[10px] text-zinc-600">(typed)</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/insights/user/${encodeURIComponent(r.distinct_id)}`}
                      className="font-mono text-xs text-zinc-400 hover:text-emerald-400"
                      title={r.distinct_id}
                    >
                      {r.email ?? (r.distinct_id.length > 18 ? r.distinct_id.slice(0, 18) + '…' : r.distinct_id)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {r.result_count === null ? (
                      <span className="text-zinc-600">—</span>
                    ) : r.zero_result ? (
                      <span className="rounded-full border border-amber-800 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">0 results</span>
                    ) : (
                      <span className="font-mono tabular-nums text-zinc-300">{r.result_count}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{r.clicked ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-600">—</span>}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500" title={r.created_at}>{when(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
