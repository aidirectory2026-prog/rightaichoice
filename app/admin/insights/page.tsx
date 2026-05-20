// Phase 8.g.7 (2026-05-20) — /admin/insights — full analytics dashboard
// backed by Supabase user_events + user_intent_profile. Built because
// Mixpanel free tier caps saved reports at ~10 per project, which can't
// fit the 30+ tiles we need.

import Link from 'next/link'
import { BarChart3, ChevronLeft } from 'lucide-react'
import {
  type DayWindow,
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
import { BarList, FunnelStrip, LineMini, MetricRow, SectionHeading } from './charts'

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
  searchParams: Promise<{ days?: string }>
}) {
  const sp = await searchParams
  const requested = Number(sp.days ?? '7') as DayWindow
  const days: DayWindow = ([1, 7, 30, 90] as DayWindow[]).includes(requested) ? requested : 7

  // Fire all queries in parallel — each is cheap (indexed GROUP BY).
  const [
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
    getOverviewMetrics(days),
    getDailyActiveUsers(days),
    getPageViewsByDevice(days),
    getTopReferrers(days),
    getPlanFunnel(days),
    getTopExistingTools(days),
    getTopUseCases(days),
    getEngagementMetrics(days),
    getTopEvents(days),
    getSearchMetrics(days),
    getTopSearches(days),
    getChatMetrics(days),
    getTopChatTools(days),
    getTopViewedTools(days),
    getTopClickedTools(days),
    getTopSavedTools(days),
    getTopComparedTools(days),
  ])

  return (
    <div>
      {/* ── Top bar: title + date filter + back to admin ──── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            Admin
          </Link>
          <span className="text-zinc-700">/</span>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            Insights
          </h1>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <Link
              key={w.value}
              href={`/admin/insights?days=${w.value}`}
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

      <p className="mb-4 text-xs text-zinc-500">
        Data is captured from <span className="text-zinc-400">user_events</span> + <span className="text-zinc-400">user_intent_profile</span>. Same source as Mixpanel; unlike Mixpanel free tier, this has unlimited charts and SQL-level access. Click into any tool on the Vendor Audience board for its full audience snapshot.
      </p>

      {/* ── 1. Acquisition ─────────────────────────────── */}
      <SectionHeading title="Acquisition" subtitle="How visitors enter and how many convert" />
      <MetricRow metrics={overview} />
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <LineMini title={`Daily active users · ${days}d`} points={dailyActive} />
        <BarList title="Page views by device" rows={deviceBreakdown} />
      </div>
      <div className="mt-3">
        <BarList title="Top first-touch referrers" rows={referrers} emptyHint="No referrer data yet — UTM tags or external traffic needed" />
      </div>

      {/* ── 2. Plan Funnel ─────────────────────────────── */}
      <SectionHeading title="Plan Funnel" subtitle="Highest-intent vendor signal — where users drop off" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <FunnelStrip title="Plan flow conversion" steps={planFunnel} />
        </div>
        <div className="lg:col-span-1">
          <BarList title="Tools mentioned as 'already use'" rows={topExistingTools} emptyHint="No plan submissions yet" />
        </div>
        <div className="lg:col-span-1">
          <BarList title="Top use cases entered" rows={topUseCases} emptyHint="No use cases yet" />
        </div>
      </div>

      {/* ── 3. Engagement ──────────────────────────────── */}
      <SectionHeading title="Engagement" subtitle="Active users + top events. The 'is the site alive?' board" />
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
        subtitle="THE SALABLE ARTIFACT — per-tool audience. Click into any tool name to see its full snapshot."
      />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <BarList
          title="Most viewed tools"
          rows={topViewedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}?days=${days}`}
        />
        <BarList
          title="Most clicked-out (affiliate visits)"
          rows={topClickedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}?days=${days}`}
        />
        <BarList
          title="Most saved tools"
          rows={topSavedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}?days=${days}`}
        />
        <BarList
          title="Most-compared pairs"
          rows={topComparedTools}
          emptyHint="No comparisons yet (need 2+ users to compare same pair)"
        />
      </div>
    </div>
  )
}
