// Phase 10.5a.3 (2026-06-12) — the Users directory (/admin/insights/users).
//
// Every visitor active in the selected window, one row per distinct browser
// ID: window-scoped activity stats (events, IST active days, modal
// country/device), auth badge when the browser logged in during the window,
// and the lifetime-based New/Returning split — all served by the
// insights_user_directory RPC (migration 155, hand-SQL verified on the
// pinned audit week). Sort + page + every smart filter live in the URL
// (shareable/bookmarkable); each row drills down to the full per-user
// timeline at /admin/insights/user/[distinct_id].

import Link from 'next/link'
import { ArrowDown, ChevronLeft, ChevronRight, UserCheck, Users } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import { SearchInput } from '@/components/admin/search-input'
import { MetricInfo } from '@/components/admin/metric-info'
import { fmt } from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { withCohort } from '@/lib/admin/cohort-filter'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { countryFlag } from '../_ui/primitives'
import {
  getCountryFilterOptions,
  getFirstTouchChannels,
  getUserDirectory,
  USER_DIRECTORY_SORTS,
  type UserDirectorySort,
} from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Users — Admin' }

const PAGE_SIZE = 50

const SORT_LABELS: Record<UserDirectorySort, string> = {
  last_seen: 'Last seen',
  events: 'Events',
  first_seen: 'First seen',
}

function parseSort(v: string | undefined): UserDirectorySort {
  return (USER_DIRECTORY_SORTS as readonly string[]).includes(v ?? '')
    ? (v as UserDirectorySort)
    : 'last_seen'
}

/** 1-based page number from the URL (?page=N); clamped to >= 1. */
function parsePage(v: string | undefined): number {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

/** Compact relative time, IST absolute date past 30 days (admin is IST-anchored). */
function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diffSec = Math.round((Date.now() - t) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
}

function istDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default async function UsersDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = await withCohort(parseAdminFilters(sp), sp)
  const sort = parseSort(sp.sort)
  const page = parsePage(sp.page)
  const search = sp.q?.trim() || undefined

  const [{ rows, total }, countryOptions] = await Promise.all([
    getUserDirectory(filters, { sort, page: page - 1, pageSize: PAGE_SIZE, search }),
    getCountryFilterOptions(),
  ])
  // 10.7a — first-touch channel per visitor on this page: one cheap
  // PostgREST select on user_intent_profile (≤50 ids), classified in TS.
  // Visitors without a profile row / attribution show '—'.
  const channelByVisitor = await getFirstTouchChannels(rows.map((r) => r.distinct_id))

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const returningOnPage = rows.filter((r) => r.is_returning).length

  /** Rebuild the current URL with overrides — keeps every filter param. */
  const qs = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v)
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    const s = params.toString()
    return s ? `/admin/insights/users?${s}` : '/admin/insights/users'
  }

  const sortHeader = (key: UserDirectorySort) => (
    <Link
      href={qs({ sort: key === 'last_seen' ? null : key, page: null })}
      className={`inline-flex items-center gap-0.5 hover:text-zinc-200 ${
        sort === key ? 'text-emerald-400' : ''
      }`}
    >
      {SORT_LABELS[key]}
      {sort === key && <ArrowDown className="h-3 w-3" />}
    </Link>
  )

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Users className="h-5 w-5 text-emerald-500" />
            Users
            <MetricInfo docKey="users_directory" align="left" />
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <SearchInput param="q" placeholder="Email or visitor ID…" />
          <FilterBar
            activeRange={filters.range.key}
            countries={countryOptions}
            eventNames={[...SCHEMA_EVENT_NAMES]}
          />
        </div>
      </div>

      <p className="mb-3 text-xs text-zinc-500">
        <span className="font-medium text-zinc-300">{fmt(total)}</span> visitors active in the
        selected window · sorted by {SORT_LABELS[sort].toLowerCase()} · page {page} of {totalPages}
        {rows.length > 0 ? (
          <span className="ml-2 text-zinc-600">
            ({returningOnPage} returning / {rows.length - returningOnPage} new on this page)
          </span>
        ) : null}
      </p>

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/50">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-2 text-left font-medium">Visitor</th>
              <th className="px-3 py-2 text-left font-medium">
                <span className="inline-flex items-center gap-1">
                  Status
                  <MetricInfo docKey="users_returning_badge" align="left" />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium">{sortHeader('first_seen')}</th>
              <th className="px-3 py-2 text-left font-medium">{sortHeader('last_seen')}</th>
              <th className="px-3 py-2 text-right font-medium">{sortHeader('events')}</th>
              <th className="px-3 py-2 text-right font-medium">Active days</th>
              <th className="px-3 py-2 text-left font-medium">Country</th>
              <th className="px-3 py-2 text-left font-medium">Device</th>
              <th className="px-3 py-2 text-left font-medium">Channel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-zinc-500">
                  No visitors match the selected window + filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.distinct_id} className="hover:bg-zinc-900/40">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/insights/user/${encodeURIComponent(r.distinct_id)}`}
                      className="group inline-flex items-center gap-1.5"
                      title={r.distinct_id}
                    >
                      <span className="font-mono text-zinc-200 group-hover:text-emerald-400">
                        {r.distinct_id.length > 18 ? `${r.distinct_id.slice(0, 18)}…` : r.distinct_id}
                      </span>
                      {r.user_id && (
                        <span
                          className="inline-flex max-w-[220px] items-center gap-0.5 truncate rounded-full border border-sky-800 bg-sky-950/40 px-1.5 py-0.5 text-[9px] font-medium text-sky-300"
                          title={
                            r.email
                              ? `${r.full_name || r.email} · signed up via ${r.auth_provider ?? 'unknown'} · ${r.user_id}`
                              : `Signed-in account: ${r.user_id}`
                          }
                        >
                          <UserCheck className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{r.email ?? 'account'}</span>
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {r.is_returning ? (
                      <span className="rounded-full border border-violet-800 bg-violet-950/40 px-1.5 py-0.5 text-[9px] font-medium text-violet-300">
                        returning
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
                        new
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400" title={istDateTime(r.first_seen)}>
                    {relativeTime(r.first_seen)}
                  </td>
                  <td className="px-3 py-2 text-zinc-300" title={istDateTime(r.last_seen)}>
                    {relativeTime(r.last_seen)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-200">
                    {fmt(r.events_in_window)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-400">
                    {r.active_days}
                  </td>
                  <td className="px-3 py-2">
                    {r.top_country ? (
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-300">
                        <span className="text-xs leading-none">{countryFlag(r.top_country)}</span>
                        {r.top_country}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.top_device ? (
                      <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] capitalize text-zinc-300">
                        {r.top_device}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {channelByVisitor.has(r.distinct_id) ? (
                      <span
                        className="rounded border border-indigo-900/60 bg-indigo-950/30 px-1.5 py-0.5 text-[10px] text-indigo-300"
                        title={`First-touch source: ${channelByVisitor.get(r.distinct_id)!.source}`}
                      >
                        {channelByVisitor.get(r.distinct_id)!.channel}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
        <span>
          Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {(page - 1) * PAGE_SIZE + rows.length} of {fmt(total)}
        </span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={qs({ page: page - 1 === 1 ? null : String(page - 1) })}
              className="inline-flex items-center gap-1 rounded border border-zinc-800 px-2 py-1 text-zinc-300 hover:border-zinc-600 hover:text-white"
            >
              <ChevronLeft className="h-3 w-3" />Prev
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded border border-zinc-900 px-2 py-1 text-zinc-700">
              <ChevronLeft className="h-3 w-3" />Prev
            </span>
          )}
          <span className="tabular-nums">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={qs({ page: String(page + 1) })}
              className="inline-flex items-center gap-1 rounded border border-zinc-800 px-2 py-1 text-zinc-300 hover:border-zinc-600 hover:text-white"
            >
              Next<ChevronRight className="h-3 w-3" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded border border-zinc-900 px-2 py-1 text-zinc-700">
              Next<ChevronRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-zinc-600">
        A row is a distinct browser ID — the same human on two devices is two rows until login
        stitches them (the account badge). Click a visitor for their full session timeline.
      </p>
    </div>
  )
}
