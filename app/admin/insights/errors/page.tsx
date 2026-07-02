// Phase 2 (2026-06-16) — Error monitoring. Surfaces error_encountered events
// split into APP (real bugs worth fixing) vs RESOURCE (failed first-party asset
// loads — mostly transient _next/image hiccups) vs EXTENSION (browser-extension
// / inline script errors attributed to the page URL, e.g. SEO/schema validators).
// The split is what stops genuine app errors from drowning in 3rd-party noise —
// historically ~95% of error_encountered volume was non-app. Classification lives
// in the insights_error_overview RPC (migration 160). Admin-only (service_role).

import Link from 'next/link'
import { ChevronLeft, Bug } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricCard, fmt } from '@/components/admin/charts'
import { filtersToJsonb, parseAdminFilters, type AdminFilters } from '@/lib/admin/filters'
import { withCohort } from '@/lib/admin/cohort-filter'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Errors — Admin' }

type ErrorRow = {
  category: 'app' | 'resource' | 'extension'
  message: string
  error_type: string | null
  occurrences: number
  page_count: number
  sample_page: string | null
  first_seen: string | null
  last_seen: string | null
}

async function getErrorOverview(f: AdminFilters): Promise<ErrorRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any).rpc('insights_error_overview', {
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    p_include_bots: f.includeBots,
    // dropEvent: already pinned to error_encountered; other dimensions apply.
    p_filters: filtersToJsonb(f, { dropEvent: true }),
  })
  return ((data ?? []) as ErrorRow[]).map((r) => ({
    ...r,
    occurrences: Number(r.occurrences),
    page_count: Number(r.page_count),
  }))
}

function ago(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TYPE_LABEL: Record<string, string> = {
  js_error: 'JS error',
  unhandled_rejection: 'Promise rejection',
  react_boundary: 'React boundary',
  resource_error: 'Resource load',
}

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await withCohort(parseAdminFilters(sp), sp)

  const [rows, countryOptions] = await Promise.all([
    getErrorOverview(filters),
    getCountryFilterOptions(),
  ])

  const app = rows.filter((r) => r.category === 'app').sort((a, b) => b.occurrences - a.occurrences)
  const resource = rows.filter((r) => r.category === 'resource').sort((a, b) => b.occurrences - a.occurrences)
  const extension = rows.filter((r) => r.category === 'extension').sort((a, b) => b.occurrences - a.occurrences)
  const sum = (rs: ErrorRow[]) => rs.reduce((s, r) => s + r.occurrences, 0)
  const appTotal = sum(app)
  const total = sum(rows)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Bug className="h-5 w-5 text-emerald-500" />
            Errors
          </h1>
        </div>
        <FilterBar
          activeRange={filters.range.key}
          countries={countryOptions}
          eventNames={[...SCHEMA_EVENT_NAMES]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="App errors"
          value={appTotal}
          extra={<span className="text-[10px] text-zinc-600">{app.length} distinct — real bugs</span>}
        />
        <MetricCard
          label="Resource failures"
          value={sum(resource)}
          extra={<span className="text-[10px] text-zinc-600">first-party asset loads (mostly transient)</span>}
        />
        <MetricCard
          label="Extension / inline"
          value={sum(extension)}
          extra={<span className="text-[10px] text-zinc-600">browser-extension noise, not our code</span>}
        />
        <MetricCard
          label="App share"
          value={total > 0 ? Math.round((appTotal / total) * 1000) / 10 : 0}
          suffix="%"
          extra={<span className="text-[10px] text-zinc-600">of all captured errors</span>}
        />
      </div>

      {/* APP ERRORS — the only bucket that needs action */}
      <h2 className="mb-2 mt-6 text-sm font-semibold text-zinc-200">App errors (action needed)</h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Message</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Hits</th>
              <th className="px-3 py-2 text-right font-medium">Pages</th>
              <th className="px-3 py-2 font-medium">Sample page</th>
              <th className="px-3 py-2 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80">
            {app.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  No app errors in this window. 🎉
                </td>
              </tr>
            ) : (
              app.map((r, i) => (
                <tr key={i} className="hover:bg-zinc-900/40">
                  <td className="max-w-[420px] px-3 py-2 text-zinc-200" title={r.message}>
                    <span className="line-clamp-2 font-mono text-[12px]">{r.message}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{TYPE_LABEL[r.error_type ?? ''] ?? r.error_type ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-300">{fmt(r.occurrences)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-400">{r.page_count}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-zinc-400" title={r.sample_page ?? ''}>
                    {r.sample_page ? (
                      <Link href={r.sample_page} className="hover:text-emerald-400">{r.sample_page}</Link>
                    ) : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500" title={r.last_seen ?? ''}>{ago(r.last_seen)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* NOISE — collapsed by default so it never buries the signal */}
      <details className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/20">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">
          Resource failures &amp; extension noise ({fmt(sum(resource) + sum(extension))} hits, {resource.length + extension.length} distinct) — usually safe to ignore
        </summary>
        <div className="border-t border-zinc-800 px-4 py-3">
          <p className="mb-2 text-xs text-zinc-500">
            <strong className="text-zinc-400">Resource</strong> = first-party assets that failed to load (mostly transient
            <code className="mx-1 text-zinc-400">_next/image</code> optimizer hiccups). <strong className="text-zinc-400">Extension</strong> =
            JS errors whose source is the page URL, not a bundle chunk — browser extensions (SEO/schema validators) running on the page, not our code.
          </p>
          <ul className="space-y-1">
            {[...resource, ...extension].slice(0, 40).map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-mono text-zinc-500" title={r.message}>
                  <span className={r.category === 'extension' ? 'text-violet-400' : 'text-sky-400'}>[{r.category}]</span> {r.message}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-zinc-600">{fmt(r.occurrences)}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  )
}
