// Phase 8.g.7 (2026-05-20) — /admin/insights — analytics dashboard
// Phase 8.g.8 (2026-05-21) — bot filter + bot-share tile + nav to /events
// + /reconciliation. Default behaviour: bots EXCLUDED. Toggle via
// ?include_bots=1.

import Link from 'next/link'
import { BarChart3, Bot, ChevronLeft, Eye, GitCompareArrows } from 'lucide-react'
import {
  type DayWindow,
  getBotShare,
  getChatMetrics,
  getDailyActiveUsers,
  getEngagementMetrics,
  getOverviewMetrics,
  getPageViewsByDevice,
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
import { BarList, FunnelStrip, LineMini, MetricCard, MetricRow, SectionHeading } from './charts'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Insights — Admin' }

const WINDOWS: { value: DayWindow; label: string }[] = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; include_bots?: string }>
}) {
  const sp = await searchParams
  const requested = Number(sp.days ?? '7') as DayWindow
  const days: DayWindow = ([1, 7, 30, 90] as DayWindow[]).includes(requested) ? requested : 7
  const includeBots = sp.include_bots === '1'

  // Fire all queries in parallel.
  const [
    botShare,
    overview,
    dailyActive,
    deviceBreakdown,
    referrers,
    planFunnel,
    topExistingTools,
    topUseCases,
    engagement,
    topEvents,
    searchMetrics,
    topSearches,
    chatMetrics,
    topChatTools,
    topViewedTools,
    topClickedTools,
    topSavedTools,
    topComparedTools,
  ] = await Promise.all([
    getBotShare(days),
    getOverviewMetrics(days, includeBots),
    getDailyActiveUsers(days, includeBots),
    getPageViewsByDevice(days, includeBots),
    getTopReferrers(days, includeBots),
    getPlanFunnel(days, includeBots),
    getTopExistingTools(days, includeBots),
    getTopUseCases(days, includeBots),
    getEngagementMetrics(days, includeBots),
    getTopEvents(days, includeBots),
    getSearchMetrics(days, includeBots),
    getTopSearches(days, includeBots),
    getChatMetrics(days, includeBots),
    getTopChatTools(days, includeBots),
    getTopViewedTools(days, includeBots),
    getTopClickedTools(days, includeBots),
    getTopSavedTools(days, includeBots),
    getTopComparedTools(days, includeBots),
  ])

  const queryString = (opts: { days?: DayWindow; include_bots?: boolean }) => {
    const parts: string[] = []
    if (opts.days) parts.push(`days=${opts.days}`)
    if (opts.include_bots) parts.push('include_bots=1')
    return parts.length ? `?${parts.join('&')}` : ''
  }

  return (
    <div>
      {/* ── Top bar: title + date filter + bot toggle + back to admin ── */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft className="h-3 w-3" />
            Admin
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            Insights
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Sub-page nav */}
          <div className="flex gap-1">
            <Link
              href={`/admin/insights/events${queryString({ days, include_bots: includeBots })}`}
              className="flex items-center gap-1 rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <Eye className="h-3 w-3" />
              Raw events
            </Link>
            <Link
              href={`/admin/insights/reconciliation${queryString({ days })}`}
              className="flex items-center gap-1 rounded border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <GitCompareArrows className="h-3 w-3" />
              vs Mixpanel
            </Link>
          </div>
          {/* Bot toggle */}
          <Link
            href={`/admin/insights${queryString({ days, include_bots: !includeBots })}`}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium border transition-colors ${
              includeBots
                ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                : 'text-zinc-400 hover:text-zinc-200 border-zinc-800'
            }`}
          >
            <Bot className="h-3 w-3" />
            {includeBots ? 'Including bots' : 'Humans only'}
          </Link>
          {/* Date window */}
          <div className="flex gap-1">
            {WINDOWS.map((w) => (
              <Link
                key={w.value}
                href={`/admin/insights${queryString({ days: w.value, include_bots: includeBots })}`}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  w.value === days
                    ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800'
                    : 'text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {w.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs text-zinc-500">
        Data from <span className="text-zinc-400">user_events</span> + <span className="text-zinc-400">user_intent_profile</span>. Bot-detection (user-agent regex) flagged{' '}
        <span className="text-zinc-300">{botShare.bot_events.toLocaleString()}</span> of{' '}
        <span className="text-zinc-300">{botShare.total_events.toLocaleString()}</span> events
        ({botShare.bot_pct}%) in this window. {includeBots ? 'Charts include bots.' : 'Charts exclude bots.'}{' '}
        <Link href={`/admin/insights/reconciliation${queryString({ days })}`} className="text-emerald-400 hover:underline">Why this differs from Mixpanel →</Link>
      </p>

      {/* ── Bot-share tile row ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Bot events" value={botShare.bot_events} suffix={`${botShare.bot_pct}%`} />
        <MetricCard label="Bot visitors" value={botShare.bot_visitors} suffix={`${botShare.bot_visitor_pct}%`} />
        <MetricCard label="Total events" value={botShare.total_events} />
        <MetricCard label="Total visitors (all)" value={botShare.total_visitors} />
        <MetricCard label="Human events" value={botShare.total_events - botShare.bot_events} />
        <MetricCard label="Human visitors" value={botShare.total_visitors - botShare.bot_visitors} />
      </div>

      {/* ── 1. Acquisition ─────────────────────────────── */}
      <SectionHeading title="Acquisition" subtitle="How visitors enter and how many convert" />
      <MetricRow metrics={overview} />
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <LineMini title={`Daily active users · ${days}d`} points={dailyActive} />
        <BarList title="Page views by device" rows={deviceBreakdown} />
      </div>
      <div className="mt-3">
        <BarList title="Top first-touch referrers" rows={referrers} emptyHint="No referrer data yet" />
      </div>

      {/* ── 2. Plan Funnel ─────────────────────────────── */}
      <SectionHeading title="Plan Funnel" subtitle="Highest-intent vendor signal — where users drop off" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FunnelStrip title="Plan flow conversion" steps={planFunnel} />
        <BarList title="Tools mentioned as 'already use'" rows={topExistingTools} emptyHint="No plan submissions yet" />
        <BarList title="Top use cases entered" rows={topUseCases} emptyHint="No use cases yet" />
      </div>

      {/* ── 3. Engagement ──────────────────────────────── */}
      <SectionHeading title="Engagement" subtitle="Active users + top events" />
      <MetricRow metrics={engagement} />
      <div className="mt-4">
        <BarList title={`Top events · ${days}d`} rows={topEvents} />
      </div>

      {/* ── 4. Search ──────────────────────────────────── */}
      <SectionHeading title="Search" subtitle="Query progression, zero-result gaps, click-through" />
      <MetricRow metrics={searchMetrics} suffixes={{ 'Zero-result rate': '%', 'CTR %': '%' }} />
      <div className="mt-4">
        <BarList title="Top searched queries" rows={topSearches} emptyHint="No searches yet" />
      </div>

      {/* ── 5. AI Chat ─────────────────────────────────── */}
      <SectionHeading title="AI Chat" subtitle="Usage, tool mentions, conversion" />
      <MetricRow metrics={chatMetrics} />
      <div className="mt-4">
        <BarList title="Tools mentioned in chat" rows={topChatTools} emptyHint="No chat tool-mentions yet" />
      </div>

      {/* ── 6. Vendor Audience Snapshot ─────────────────── */}
      <SectionHeading
        title="Vendor Audience Snapshot"
        subtitle="THE SALABLE ARTIFACT — per-tool audience. Click any tool name for its full snapshot."
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BarList
          title="Most viewed tools"
          rows={topViewedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}${queryString({ days, include_bots: includeBots })}`}
        />
        <BarList
          title="Most clicked-out (affiliate visits)"
          rows={topClickedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}${queryString({ days, include_bots: includeBots })}`}
        />
        <BarList
          title="Most saved tools"
          rows={topSavedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}${queryString({ days, include_bots: includeBots })}`}
        />
        <BarList
          title="Most-compared pairs"
          rows={topComparedTools}
          emptyHint="No comparisons yet"
        />
      </div>
    </div>
  )
}
