// Diagnostic: render each /admin/insights chart in isolation with live
// data. Whichever section is missing / shows an error is the culprit.

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
} from '../queries'
import { BarList, FunnelStrip, LineMini, MetricCard, MetricRow } from '../charts'
import { LiveEventsTicker } from '@/components/admin/live-events-ticker'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Insights charts test' }

function Section({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 border border-zinc-800 rounded-lg p-4">
      <div className="text-xs font-mono text-emerald-400 mb-3">{name}</div>
      {children}
    </div>
  )
}

export default async function ChartsTest() {
  const days: DayWindow = 7
  const includeBots = false

  const [
    botShare, overview, dailyActive, deviceBreakdown, referrers,
    planFunnel, topExistingTools, topUseCases, engagement, topEvents,
    searchMetrics, topSearches, chatMetrics, topChatTools,
    topViewedTools, topClickedTools, topSavedTools, topComparedTools,
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

  return (
    <div>
      <h1 className="text-lg font-semibold text-white mb-4">Insights charts — bisect test</h1>
      <p className="text-xs text-zinc-500 mb-6">
        Each section below is one chart. The LAST section you see before the page breaks is adjacent to the culprit.
      </p>

      <Section name="1. LiveEventsTicker (client)">
        <LiveEventsTicker />
      </Section>

      <Section name="2. MetricCard x 6 (bot share)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Bot events" value={botShare.bot_events} suffix={`${botShare.bot_pct}%`} />
          <MetricCard label="Bot visitors" value={botShare.bot_visitors} suffix={`${botShare.bot_visitor_pct}%`} />
          <MetricCard label="Total events" value={botShare.total_events} />
          <MetricCard label="Total visitors (all)" value={botShare.total_visitors} />
          <MetricCard label="Human events" value={botShare.total_events - botShare.bot_events} />
          <MetricCard label="Human visitors" value={botShare.total_visitors - botShare.bot_visitors} />
        </div>
      </Section>

      <Section name="3. MetricRow (overview)">
        <MetricRow metrics={overview} />
      </Section>

      <Section name="4. LineMini (dailyActive)">
        <LineMini title="Daily active users" points={dailyActive} />
      </Section>

      <Section name="5. BarList (deviceBreakdown — empty)">
        <BarList title="Page views by device" rows={deviceBreakdown} />
      </Section>

      <Section name="6. BarList (referrers)">
        <BarList title="Top referrers" rows={referrers} />
      </Section>

      <Section name="7. FunnelStrip (planFunnel)">
        <FunnelStrip title="Plan flow" steps={planFunnel} />
      </Section>

      <Section name="8. BarList (topExistingTools)">
        <BarList title="Existing tools" rows={topExistingTools} />
      </Section>

      <Section name="9. BarList (topUseCases — long labels)">
        <BarList title="Use cases" rows={topUseCases} />
      </Section>

      <Section name="10. MetricRow (engagement)">
        <MetricRow metrics={engagement} />
      </Section>

      <Section name="11. BarList (topEvents — 20 rows)">
        <BarList title="Top events" rows={topEvents} />
      </Section>

      <Section name="12. MetricRow (searchMetrics with suffixes)">
        <MetricRow metrics={searchMetrics} suffixes={{ 'Zero-result rate': '%', 'CTR %': '%' }} />
      </Section>

      <Section name="13. BarList (topSearches)">
        <BarList title="Top searches" rows={topSearches} />
      </Section>

      <Section name="14. MetricRow (chatMetrics)">
        <MetricRow metrics={chatMetrics} />
      </Section>

      <Section name="15. BarList (topChatTools)">
        <BarList title="Chat tools" rows={topChatTools} />
      </Section>

      <Section name="16. BarList (topViewedTools with hrefBuilder)">
        <BarList
          title="Most viewed tools"
          rows={topViewedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}`}
        />
      </Section>

      <Section name="17. BarList (topClickedTools)">
        <BarList
          title="Most clicked tools"
          rows={topClickedTools}
          rowHrefBuilder={(slug) => `/admin/insights/tool/${encodeURIComponent(slug)}`}
        />
      </Section>

      <Section name="18. BarList (topSavedTools)">
        <BarList title="Most saved tools" rows={topSavedTools} />
      </Section>

      <Section name="19. BarList (topComparedTools)">
        <BarList title="Most compared" rows={topComparedTools} />
      </Section>

      <p className="text-emerald-400 text-sm mt-8">✓ All sections rendered.</p>
    </div>
  )
}
