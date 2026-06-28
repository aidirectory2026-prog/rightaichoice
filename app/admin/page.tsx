// Phase 10.5a.2 (2026-06-12) — the REAL /admin dashboard.
//
// Replaces the redirect-to-insights placeholder. Server component on the
// Phase-4 shell: global smart filter bar (URL state), KPI row with
// period-over-period deltas, the "Right now" pulse strip (audit F5
// resolution — see comment below), DAU trend, and drill-down BarLists.
// Every tile carries an ⓘ provenance popover fed by lib/admin/metric-docs.ts.

import Link from 'next/link'
import { LayoutDashboard, Radio, UserCheck, Sparkles } from 'lucide-react'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { FilterBar } from '@/components/admin/filter-bar'
import { MetricInfo } from '@/components/admin/metric-info'
import {
  BarList,
  DailyChart,
  DeltaChip,
  MetricCard,
  fmt,
} from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import {
  getCountryFilterOptions,
  getDailyActiveUsers,
  getEngagementMetrics,
  getTopChannels,
  getTopClickedTools,
  getTopEvents,
  getTopReferrers,
  getTopViewedTools,
} from './insights/queries'
import { getDashboardKpis, getTopPages } from './queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Dashboard — Admin' }

/** Drill-down target per KPI tile (gate: every href must resolve). */
const KPI_HREFS: Record<string, string> = {
  kpi_visitors: '/admin/insights/users',
  kpi_page_views: '/admin/insights/events?event=page_viewed',
  kpi_signed_in: '/admin/insights/users?auth=known',
  kpi_signups: '/admin/insights/events?event=signup_completed',
  kpi_outclicks: '/admin/insights/events?event=tool_visit_redirected',
  kpi_newsletter: '/admin/insights/events?event=newsletter_subscribed',
}

/** First-touch referrer labels are stored URLs (or "(direct)"/"(unknown)");
 *  extract a hostname the insights `source` filter can consume. */
function sourceHostOf(label: string): string | null {
  if (!label || label.startsWith('(')) return null
  try {
    return new URL(label).hostname.replace(/^www\./, '')
  } catch {
    // bare-host first-touch values pass through if they look hostname-ish
    return /^[a-z0-9.-]+$/i.test(label) ? label.toLowerCase() : null
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const filters = parseAdminFilters(sp)
  const sel = filters.range
  const days = sel.days
  const includeBots = filters.includeBots

  const [
    kpis, dailyActive, engagement, referrers, channels, topPages,
    topEvents, topViewedTools, topClickedTools, countryOptions,
  ] = await Promise.all([
    getDashboardKpis(filters),
    getDailyActiveUsers(filters),
    // NOTE: getEngagementMetrics is now-anchored BY DESIGN — see the
    // "Right now" strip below (audit F5 resolution). It now honours the smart
    // filters (BUG-09) while keeping the fixed DAU/WAU/MAU windows.
    getEngagementMetrics(filters),
    getTopReferrers(filters),
    getTopChannels(filters),
    getTopPages(filters),
    getTopEvents(filters),
    getTopViewedTools(filters),
    getTopClickedTools(filters),
    getCountryFilterOptions(),
  ])

  const toolQs = (slug: string) =>
    `/admin/insights/tool/${encodeURIComponent(slug)}?days=${days}${includeBots ? '&include_bots=1' : ''}`

  // Latest signups, straight from auth.users — so a new member is never missed.
  type MemberBrief = { user_id: string; email: string | null; full_name: string | null; provider: string | null; signed_up: string; distinct_id: string | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membersRes = await (getAdminClient() as any).rpc('insights_registered_users')
  const allMembers = (membersRes.data ?? []) as MemberBrief[]
  const recentMembers = allMembers.slice(0, 5)
  const newMembers7d = allMembers.filter((m) => Date.now() - new Date(m.signed_up).getTime() < 7 * 86_400_000).length

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <LayoutDashboard className="h-5 w-5 text-emerald-500" />
          Dashboard
        </h1>
        <FilterBar
          activeRange={sel.key}
          countries={countryOptions}
          eventNames={[...SCHEMA_EVENT_NAMES]}
        />
      </div>

      {/* ── KPI row: current window vs the immediately-preceding window ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <MetricCard
            key={k.key}
            label={k.label}
            value={k.current}
            info={<MetricInfo docKey={k.key} />}
            extra={
              <div className="flex items-center justify-between gap-1">
                <DeltaChip current={k.current} previous={k.previous} />
                <Link
                  href={KPI_HREFS[k.key] ?? '/admin/insights'}
                  className="text-[10px] text-zinc-600 hover:text-emerald-400"
                >
                  View →
                </Link>
              </div>
            }
          />
        ))}
      </div>

      {/* ── Latest members (never miss a signup) ───────────────────────── */}
      <div className="mt-6 rounded-lg border border-emerald-900/60 bg-emerald-950/15 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
            <UserCheck className="h-4 w-4" />
            Latest members
            <span className="text-xs font-normal text-emerald-500/80">
              {allMembers.length} total{newMembers7d > 0 ? ` · ${newMembers7d} new this week` : ''}
            </span>
          </div>
          <Link href="/admin/insights/members" className="text-xs text-emerald-400 hover:text-emerald-300">See all members →</Link>
        </div>
        {recentMembers.length === 0 ? (
          <div className="text-xs text-zinc-500">No registered members yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {recentMembers.map((m) => {
              const fresh = Date.now() - new Date(m.signed_up).getTime() < 7 * 86_400_000
              const inner = (
                <span className="flex items-center gap-1.5">
                  {fresh && <Sparkles className="h-3 w-3 text-emerald-400" />}
                  <span className="text-zinc-200">{m.email ?? m.full_name ?? 'member'}</span>
                  <span className="text-[10px] text-zinc-500">{m.provider ?? 'email'} · {new Date(m.signed_up).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </span>
              )
              return m.distinct_id ? (
                <Link key={m.user_id} href={`/admin/insights/user/${encodeURIComponent(m.distinct_id)}`} className="rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs hover:border-emerald-800">{inner}</Link>
              ) : (
                <span key={m.user_id} className="rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-xs">{inner}</span>
              )
            })}
          </div>
        )}
      </div>

      {/*
        ── "Right now" pulse strip ──────────────────────────────────────
        RESOLVES AUDIT F5 (docs/admin/metric-audit.md): getEngagementMetrics
        is now-anchored BY DESIGN (IST-today / rolling 7d / rolling 30d,
        no p_end, no optional filters). Instead of letting these six tiles
        silently disagree with the filtered panels, they live in this
        visually distinct strip whose label states the exemption outright.
      */}
      <div className="mt-6 rounded-lg border border-sky-900/70 bg-sky-950/20 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-sky-300">
            <Radio className="h-4 w-4" />
            Right now
            <span className="text-xs font-normal text-sky-500/80">
              live windows, not affected by filters above
            </span>
          </div>
          <MetricInfo docKey="right_now_pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {engagement.map((m) => (
            <div key={m.label} className="rounded border border-sky-900/40 bg-zinc-950/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-sky-600">{m.label}</div>
              <div className="mt-1 text-lg font-semibold text-white tabular-nums">{fmt(m.value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trend + sources ─────────────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DailyChart
          title={`Daily active users · ${days}d`}
          points={dailyActive}
          info={<MetricInfo docKey="dau_trend" />}
        />
        <BarList
          title="Top sources · first-touch · visitors"
          rows={referrers}
          emptyHint="No referrer data yet (attribution capture began 2026-06-10)"
          info={<MetricInfo docKey="top_sources" />}
          rowHrefBuilder={(label) => {
            const host = sourceHostOf(label)
            return host ? `/admin/insights?source=${encodeURIComponent(host)}` : null
          }}
        />
        {/* 10.7a — per-event channel taxonomy (classifier epoch 2026-06-12) */}
        <BarList
          title="Channels · visitors"
          rows={channels}
          emptyHint="No channel data yet (channel capture began 2026-06-12)"
          info={<MetricInfo docKey="top_channels" />}
        />
      </div>

      {/* ── Top pages / events / tools, all drill-down ──────────────────── */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BarList
          title="Top pages · views"
          rows={topPages}
          emptyHint="No page views in selected window"
          info={<MetricInfo docKey="top_pages" />}
        />
        <BarList
          title={`Top events · ${days}d`}
          rows={topEvents}
          info={<MetricInfo docKey="top_events" />}
          rowHrefBuilder={(name) => `/admin/insights/events?event=${encodeURIComponent(name)}`}
        />
        <BarList
          title="Most viewed tools"
          rows={topViewedTools}
          emptyHint="No tool views in selected window"
          info={<MetricInfo docKey="top_tools_viewed" />}
          rowHrefBuilder={toolQs}
        />
        <BarList
          title="Most clicked-out tools (affiliate visits)"
          rows={topClickedTools}
          emptyHint="No outclicks in selected window"
          info={<MetricInfo docKey="top_tools_clicked" />}
          rowHrefBuilder={toolQs}
        />
      </div>

      <p className="mt-6 text-[11px] text-zinc-600">
        Deltas compare the selected window against the immediately-preceding window of equal
        length. Click any ⓘ for what a number counts, how it&apos;s computed, and why it&apos;s
        trustworthy. Deeper audience + behavior panels live under{' '}
        <Link href="/admin/insights" className="text-zinc-400 hover:text-emerald-400">Insights</Link>.
      </p>
    </div>
  )
}
