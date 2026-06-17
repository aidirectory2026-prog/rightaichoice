// Phase 10 (Traffic Analysis Upgrade) — Plan drop-off. Names every visitor who
// STARTED a plan, the furthest step they reached, whether they completed, and the
// goal they typed — so the owner can see exactly WHO abandoned the plan and WHERE.
// Powered by insights_plan_dropoff (migration 162). Admin-only (service_role).

import Link from 'next/link'
import { ChevronLeft, UserMinus } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricCard, fmt } from '@/components/admin/charts'
import { parseAdminFilters, type AdminFilters } from '@/lib/admin/filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import { getCountryFilterOptions } from '../queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Plan drop-off — Admin' }

type DropoffRow = {
  distinct_id: string
  user_id: string | null
  email: string | null
  full_name: string | null
  furthest_step: number
  furthest_label: string | null
  completed: boolean
  goal_text: string | null
  events_in_journey: number
  last_activity: string | null
}

async function getPlanDropoff(f: AdminFilters): Promise<DropoffRow[]> {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db as any).rpc('insights_plan_dropoff', {
    p_cutoff: f.range.cutoffISO,
    p_end: f.range.endCutoffISO,
    p_include_bots: f.includeBots,
  })
  return ((data ?? []) as DropoffRow[]).map((r) => ({ ...r, events_in_journey: Number(r.events_in_journey) }))
}

function ago(iso: string | null): string {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// Step ladder for a compact visual: how far down the 4-step journey they got.
const STEP_TOTAL = 4

export default async function PlanDropoffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = parseAdminFilters(sp)
  const [rows, countryOptions] = await Promise.all([getPlanDropoff(filters), getCountryFilterOptions()])

  const entered = rows.length
  const completed = rows.filter((r) => r.completed).length
  const dropped = entered - completed

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <UserMinus className="h-5 w-5 text-emerald-500" />
            Plan drop-off
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/admin/export?type=plan_dropoff&days=30" className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-900">Export CSV</a>
          <FilterBar activeRange={filters.range.key} countries={countryOptions} eventNames={[...SCHEMA_EVENT_NAMES]} />
        </div>
      </div>

      <p className="mb-4 max-w-3xl text-xs text-zinc-500">
        Everyone who <strong className="text-zinc-300">started a plan</strong> in this window, the furthest step they
        reached, and whether they finished — so you can see exactly who dropped and where. Click a row for their full
        timeline.
      </p>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <MetricCard label="Started a plan" value={entered} kind="people" />
        <MetricCard label="Completed" value={completed} kind="people" />
        <MetricCard label="Dropped" value={dropped} kind="people" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-zinc-900/60 text-left text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Who</th>
              <th className="px-3 py-2 font-medium">Furthest step</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Goal typed</th>
              <th className="px-3 py-2 text-right font-medium">Events</th>
              <th className="px-3 py-2 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/80">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">No one started a plan in this window.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.distinct_id} className="hover:bg-zinc-900/40">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/insights/user/${encodeURIComponent(r.distinct_id)}`}
                      className="inline-flex flex-col"
                      title={r.distinct_id}
                    >
                      <span className="font-mono text-xs text-zinc-200 hover:text-emerald-400">
                        {r.email ?? (r.distinct_id.length > 22 ? r.distinct_id.slice(0, 22) + '…' : r.distinct_id)}
                      </span>
                      {r.email && r.full_name ? <span className="text-[10px] text-zinc-500">{r.full_name}</span> : null}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-zinc-300">{r.furthest_label ?? '—'}</span>
                      <span className="font-mono text-[10px] text-zinc-600">{r.furthest_step}/{STEP_TOTAL}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {r.completed ? (
                      <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">completed</span>
                    ) : (
                      <span className="rounded-full border border-amber-800 bg-amber-950/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300">dropped</span>
                    )}
                  </td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-zinc-400" title={r.goal_text ?? ''}>
                    {r.goal_text ? `“${r.goal_text}”` : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-400">{fmt(r.events_in_journey)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500" title={r.last_activity ?? ''}>{ago(r.last_activity)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
