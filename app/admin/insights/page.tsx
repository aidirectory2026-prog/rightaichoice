// /admin/insights — analytics dashboard. Simplified render: avoids the
// client-side Realtime ticker (which was the suspected blocker) and
// uses straight HTML cards for every section. Same data path as before.

import Link from 'next/link'
import { BarChart3, ChevronLeft, Eye, GitCompareArrows, ShieldCheck, Target } from 'lucide-react'
import { FilterBar } from '@/components/admin/filter-bar'
import {
  BarList,
  DailyChart,
  FunnelStrip,
  MetricCard,
  MetricRow,
  SectionHeading,
  fmt,
} from '@/components/admin/charts'
import { parseAdminFilters } from '@/lib/admin/filters'
import { SCHEMA_EVENT_NAMES } from '@/lib/analytics-schema'
import {
  getBotShare,
  getCountryFilterOptions,
  getChatMetrics,
  getDailyActiveUsers,
  getEngagementMetrics,
  getOverviewMetrics,
  getPageViewsByDevice,
  getRecentVisitors,
  getReturningSummary,
  getPlanFunnel,
  getSearchMetrics,
  getTopChatTools,
  getTopClickedTools,
  getTopComparedTools,
  getTopEvents,
  getTopExistingTools,
  getTopReferrers,
  getTopSavedTools,
  getTopSearches,
  getTopUseCases,
  getTopViewedTools,
} from './queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Insights — Admin' }

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
  // Phase 9 follow-up (2026-05-28) — admin is IST-anchored. Show absolute
  // dates in IST so a 31-day-old event in the "Recent visitor activity"
  // table doesn't read as the server's UTC date.
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  // Global smart filters (Phase 10.4.7): range + bots + the optional
  // dimension filters, all URL-state. Legacy ?include_bots=1 still parses.
  const filters = parseAdminFilters(sp)
  const sel = filters.range
  const days = sel.days
  const includeBots = filters.includeBots

  const [
    botShare, overview, dailyActive, deviceBreakdown, referrers,
    planFunnel, topExistingTools, topUseCases, engagement, topEvents,
    searchMetrics, topSearches, chatMetrics, topChatTools,
    topViewedTools, topClickedTools, topSavedTools, topComparedTools,
    returningSummary, recentVisitors, countryOptions,
  ] = await Promise.all([
    getBotShare(filters),
    getOverviewMetrics(filters),
    getDailyActiveUsers(filters),
    getPageViewsByDevice(filters),
    getTopReferrers(filters),
    getPlanFunnel(filters),
    getTopExistingTools(sel, includeBots),
    getTopUseCases(sel, includeBots),
    getEngagementMetrics(sel, includeBots),
    getTopEvents(filters),
    getSearchMetrics(filters),
    getTopSearches(sel, includeBots),
    getChatMetrics(filters),
    getTopChatTools(sel, includeBots),
    getTopViewedTools(filters),
    getTopClickedTools(filters),
    getTopSavedTools(filters),
    getTopComparedTools(filters),
    getReturningSummary(filters),
    getRecentVisitors(50, filters),
    getCountryFilterOptions(),
  ])

  const qs = (opts: { days?: number; include_bots?: boolean }) => {
    const parts: string[] = []
    if (opts.days) parts.push(`days=${opts.days}`)
    if (opts.include_bots) parts.push('include_bots=1')
    return parts.length ? `?${parts.join('&')}` : ''
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
            <ChevronLeft className="h-3 w-3" />Admin
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            Insights
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Link href="/admin/insights/goals" className="flex items-center gap-1 rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200">
              <Target className="h-3 w-3" />Goals
            </Link>
            <Link href="/admin/insights/health" className="flex items-center gap-1 rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200">
              <ShieldCheck className="h-3 w-3" />Health
            </Link>
            <Link href={`/admin/insights/events${qs({ days, include_bots: includeBots })}`} className="flex items-center gap-1 rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200">
              <Eye className="h-3 w-3" />Raw events
            </Link>
            <Link href={`/admin/insights/reconciliation${qs({ days })}`} className="flex items-center gap-1 rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200">
              <GitCompareArrows className="h-3 w-3" />vs Mixpanel
            </Link>
          </div>
          <FilterBar
            activeRange={sel.key}
            countries={countryOptions}
            eventNames={[...SCHEMA_EVENT_NAMES]}
          />
        </div>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        Bot-detection flagged <span className="text-zinc-300">{fmt(botShare.bot_events)}</span> of{' '}
        <span className="text-zinc-300">{fmt(botShare.total_events)}</span> events ({botShare.bot_pct}%) in this window.{' '}
        {includeBots ? 'Charts include bots.' : 'Charts exclude bots.'}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Bot events" value={botShare.bot_events} suffix={`${botShare.bot_pct}%`} />
        <MetricCard label="Bot visitors" value={botShare.bot_visitors} suffix={`${botShare.bot_visitor_pct}%`} />
        <MetricCard label="Total events" value={botShare.total_events} />
        <MetricCard label="Total visitors" value={botShare.total_visitors} />
        <MetricCard label="Human events" value={botShare.total_events - botShare.bot_events} />
        <MetricCard label="Human visitors" value={botShare.total_visitors - botShare.bot_visitors} />
      </div>

      <SectionHeading title="Acquisition" subtitle="How visitors enter and how many convert" />
      <MetricRow metrics={overview} />
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DailyChart title={`Daily active users · ${days}d`} points={dailyActive} />
        <BarList title="Page views by device" rows={deviceBreakdown} />
      </div>
      <div className="mt-3">
        <BarList title="Top first-touch referrers" rows={referrers} emptyHint="No referrer data yet" />
      </div>

      <SectionHeading title="Plan Funnel" subtitle="Highest-intent vendor signal — where users drop off" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FunnelStrip title="Plan flow conversion" steps={planFunnel} />
        <BarList title="Tools mentioned as 'already use'" rows={topExistingTools} emptyHint="No plan submissions yet" />
        <BarList title="Top use cases entered" rows={topUseCases} emptyHint="No use cases yet" />
      </div>

      <SectionHeading title="Engagement" subtitle="Active users + top events" />
      <MetricRow metrics={engagement} />
      <div className="mt-4">
        <BarList title={`Top events · ${days}d`} rows={topEvents} />
      </div>

      <SectionHeading
        title="Returning users"
        subtitle="Who's coming back, when they first showed up, and how active they are. Click any row for the full visitor timeline."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label={`Active visitors · ${days}d`} value={returningSummary.total} />
        <MetricCard label="New (first time)" value={returningSummary.new_count} />
        <MetricCard label="Returning" value={returningSummary.returning_count} />
        <MetricCard label="Returning rate" value={returningSummary.returning_pct} suffix="%" />
        <MetricCard
          label="Avg gap (days)"
          value={returningSummary.avg_days_between ?? 0}
          suffix={returningSummary.avg_days_between == null ? '—' : undefined}
        />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">
        <div className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300">
          Recent visitor activity · last 50 (most-recent first)
        </div>
        {recentVisitors.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">No visitor activity yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/60 text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left">Visitor</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">First seen</th>
                  <th className="px-4 py-2 text-left">Last seen</th>
                  <th className="px-4 py-2 text-right">Events</th>
                  <th className="px-4 py-2 text-right">Days active</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {recentVisitors.map((v) => (
                  <tr key={v.distinct_id} className="hover:bg-zinc-900/60">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/admin/insights/user/${encodeURIComponent(v.distinct_id)}`}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        {v.distinct_id.length > 28 ? v.distinct_id.slice(0, 26) + '…' : v.distinct_id}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {v.user_id ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-700/50 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          Logged in
                        </span>
                      ) : (
                        <span className="text-zinc-500">Anon</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-400">{relativeTime(v.first_seen)}</td>
                    <td className="px-4 py-2 text-xs text-zinc-300">{relativeTime(v.last_seen)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-300">{fmt(v.total_events)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-300">{v.active_days}</td>
                    <td className="px-4 py-2 text-right">
                      {v.is_returning ? (
                        <span className="inline-flex items-center rounded-full border border-cyan-800/40 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                          Returning
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/50 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                          New
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SectionHeading title="Search" subtitle="Query progression, zero-result gaps, click-through" />
      <MetricRow metrics={searchMetrics} suffixes={{ 'Zero-result rate': '%', 'CTR %': '%' }} />
      <div className="mt-4">
        <BarList title="Top searched queries" rows={topSearches} emptyHint="No searches yet" />
      </div>

      <SectionHeading title="AI Chat" subtitle="Usage, tool mentions, conversion" />
      <MetricRow metrics={chatMetrics} />
      <div className="mt-4">
        <BarList title="Tools mentioned in chat" rows={topChatTools} emptyHint="No chat tool-mentions yet" />
      </div>

      <SectionHeading title="Vendor Audience Snapshot" subtitle="Per-tool audience. Click any tool name for its full snapshot." />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BarList
          title="Most viewed tools"
          rows={topViewedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}${qs({ days, include_bots: includeBots })}`}
        />
        <BarList
          title="Most clicked-out (affiliate visits)"
          rows={topClickedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}${qs({ days, include_bots: includeBots })}`}
        />
        <BarList
          title="Most saved tools"
          rows={topSavedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}${qs({ days, include_bots: includeBots })}`}
        />
        <BarList title="Most-compared pairs" rows={topComparedTools} emptyHint="No comparisons yet" />
      </div>
    </div>
  )
}
