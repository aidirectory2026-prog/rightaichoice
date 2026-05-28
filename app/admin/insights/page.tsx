// /admin/insights — analytics dashboard. Simplified render: avoids the
// client-side Realtime ticker (which was the suspected blocker) and
// uses straight HTML cards for every section. Same data path as before.

import Link from 'next/link'
import { BarChart3, Bot, ChevronLeft, Eye, GitCompareArrows, ShieldCheck, Target } from 'lucide-react'
import { RangePicker as UnifiedRangePicker } from '@/components/admin/range-picker'
import { parseRange } from '@/lib/admin/range'
import {
  type DayWindow,
  getBotShare,
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
  type BarRow,
  type MetricResult,
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
  return new Date(iso).toLocaleDateString()
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function MetricCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">
        {fmt(value)}
        {suffix ? <span className="ml-1 text-sm text-zinc-400">{suffix}</span> : null}
      </div>
    </div>
  )
}

function MetricRow({ metrics, suffixes }: { metrics: MetricResult[]; suffixes?: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m, i) => (
        <MetricCard key={`${m.label}-${i}`} label={m.label} value={m.value} suffix={suffixes?.[m.label]} />
      ))}
    </div>
  )
}

function BarList({
  title, rows, emptyHint, rowHrefBuilder,
}: {
  title: string
  rows: BarRow[]
  emptyHint?: string
  rowHrefBuilder?: (label: string) => string | null
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 text-sm font-medium text-zinc-300">{title}</div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">{emptyHint || 'No data in selected window'}</div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => {
            const pct = max > 0 ? (r.value / max) * 100 : 0
            const href = rowHrefBuilder?.(r.label) ?? null
            const inner = (
              <div className="relative z-10 flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <span className="truncate text-zinc-200">{r.label || '(empty)'}</span>
                <span className="font-mono text-zinc-400">{fmt(r.value)}</span>
              </div>
            )
            return (
              <li key={`${r.label}-${i}`} className="relative overflow-hidden rounded bg-zinc-950">
                <div className="absolute inset-y-0 left-0 bg-emerald-900/40" style={{ width: `${pct}%` }} aria-hidden />
                {href ? <a href={href} className="block hover:bg-zinc-800/40">{inner}</a> : inner}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FunnelStrip({ title, steps }: { title: string; steps: MetricResult[] }) {
  const max = steps.reduce((m, s) => Math.max(m, s.value), 1)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 text-sm font-medium text-zinc-300">{title}</div>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const pctOfMax = max > 0 ? (s.value / max) * 100 : 0
          const prev = i === 0 ? 0 : steps[i - 1].value
          const pctOfPrev = i === 0 ? 100 : prev > 0 ? (s.value / prev) * 100 : 0
          return (
            <div key={`${s.label}-${i}`}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="capitalize text-zinc-200">{s.label}</span>
                <span className="font-mono text-zinc-400">
                  {fmt(s.value)}
                  {i > 0 ? (
                    <span className={`ml-2 ${pctOfPrev >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {pctOfPrev.toFixed(0)}%
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded bg-zinc-950">
                <div className="h-full bg-emerald-700" style={{ width: `${pctOfMax}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DailyChart({ title, points }: { title: string; points: { date: string; value: number }[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-2 text-sm font-medium text-zinc-300">{title}</div>
        <div className="py-6 text-center text-xs text-zinc-500">Need ≥2 days of data</div>
      </div>
    )
  }
  const max = Math.max(...points.map((p) => p.value), 1)
  const total = points.reduce((s, p) => s + p.value, 0)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-medium text-zinc-300">{title}</div>
        <div className="text-xs text-zinc-500">{fmt(total)} total · max {fmt(max)}</div>
      </div>
      <div className="flex items-end gap-1 h-20">
        {points.map((p, i) => {
          const h = max > 0 ? (p.value / max) * 100 : 0
          return (
            <div key={`${p.date}-${i}`} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${p.date}: ${p.value}`}>
              <div className="w-full bg-emerald-700/70 rounded-sm" style={{ height: `${h}%` }} />
              <span className="text-[9px] text-zinc-600">{p.date.slice(5)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 mt-8 border-b border-zinc-800 pb-2">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
    </div>
  )
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; range?: string; from?: string; to?: string; include_bots?: string }>
}) {
  const sp = await searchParams
  const sel = parseRange(sp)
  // RPCs take a literal day count; map sel.days (1/7/14/30/90/etc) to the
  // nearest legacy window so existing RPC contracts hold.
  const candidate = [1, 7, 30, 90].includes(sel.days) ? sel.days : (sel.days <= 7 ? 7 : sel.days <= 30 ? 30 : 90)
  const days: DayWindow = candidate as DayWindow
  const includeBots = sp.include_bots === '1'

  const [
    botShare, overview, dailyActive, deviceBreakdown, referrers,
    planFunnel, topExistingTools, topUseCases, engagement, topEvents,
    searchMetrics, topSearches, chatMetrics, topChatTools,
    topViewedTools, topClickedTools, topSavedTools, topComparedTools,
    returningSummary, recentVisitors,
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
    getReturningSummary(days, includeBots),
    getRecentVisitors(50, includeBots),
  ])

  const qs = (opts: { days?: DayWindow; include_bots?: boolean }) => {
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
          <Link
            href={`/admin/insights${qs({ days, include_bots: !includeBots })}`}
            className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium border ${
              includeBots ? 'bg-amber-950/40 text-amber-300 border-amber-800' : 'text-zinc-400 hover:text-zinc-200 border-zinc-800'
            }`}
          >
            <Bot className="h-3 w-3" />
            {includeBots ? 'Including bots' : 'Humans only'}
          </Link>
          <UnifiedRangePicker active={sel.key} />
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
