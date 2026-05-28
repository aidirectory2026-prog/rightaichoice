// Diagnostic: same data path as /admin/insights but renders only
// <pre>JSON</pre> — no chart components, no client components.
// Used to isolate whether the crash lives in the render pipeline.

import { parseRange } from '@/lib/admin/range'
import {
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

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'Insights raw — Admin' }

export default async function InsightsRawPage() {
  const sel = parseRange({ days: '7' })
  const includeBots = false

  const sections: Array<[string, () => Promise<unknown>]> = [
    ['botShare', () => getBotShare(sel)],
    ['overview', () => getOverviewMetrics(sel, includeBots)],
    ['dailyActive', () => getDailyActiveUsers(sel, includeBots)],
    ['deviceBreakdown', () => getPageViewsByDevice(sel, includeBots)],
    ['referrers', () => getTopReferrers(sel, includeBots)],
    ['planFunnel', () => getPlanFunnel(sel, includeBots)],
    ['topExistingTools', () => getTopExistingTools(sel, includeBots)],
    ['topUseCases', () => getTopUseCases(sel, includeBots)],
    ['engagement', () => getEngagementMetrics(sel, includeBots)],
    ['topEvents', () => getTopEvents(sel, includeBots)],
    ['searchMetrics', () => getSearchMetrics(sel, includeBots)],
    ['topSearches', () => getTopSearches(sel, includeBots)],
    ['chatMetrics', () => getChatMetrics(sel, includeBots)],
    ['topChatTools', () => getTopChatTools(sel, includeBots)],
    ['topViewedTools', () => getTopViewedTools(sel, includeBots)],
    ['topClickedTools', () => getTopClickedTools(sel, includeBots)],
    ['topSavedTools', () => getTopSavedTools(sel, includeBots)],
    ['topComparedTools', () => getTopComparedTools(sel, includeBots)],
  ]

  const results = await Promise.all(
    sections.map(async ([name, fn]) => {
      try {
        const data = await fn()
        return { name, ok: true, data }
      } catch (e) {
        const err = e as Error
        return { name, ok: false, error: `${err.name}: ${err.message}` }
      }
    }),
  )

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-4">Insights — raw render (no charts)</h1>
      <p className="text-sm text-zinc-400 mb-6">
        If you see this page and the data below, the data + SSR pipeline is healthy and the crash is in chart components.
      </p>
      <pre className="bg-zinc-900 border border-zinc-800 p-4 rounded text-xs text-zinc-300 overflow-auto">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  )
}
