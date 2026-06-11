// Diagnostic: same data path as /admin/insights but renders only
// <pre>JSON</pre> — no chart components, no client components.
// Used to isolate whether the crash lives in the render pipeline.

import { parseRange } from '@/lib/admin/range'
import { baseFilters } from '@/lib/admin/filters'
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
  // Range+bots only — no optional filters on the diagnostic page.
  const f = baseFilters(sel, includeBots)

  const sections: Array<[string, () => Promise<unknown>]> = [
    ['botShare', () => getBotShare(f)],
    ['overview', () => getOverviewMetrics(f)],
    ['dailyActive', () => getDailyActiveUsers(f)],
    ['deviceBreakdown', () => getPageViewsByDevice(f)],
    ['referrers', () => getTopReferrers(f)],
    ['planFunnel', () => getPlanFunnel(f)],
    ['topExistingTools', () => getTopExistingTools(sel, includeBots)],
    ['topUseCases', () => getTopUseCases(sel, includeBots)],
    ['engagement', () => getEngagementMetrics(sel, includeBots)],
    ['topEvents', () => getTopEvents(f)],
    ['searchMetrics', () => getSearchMetrics(f)],
    ['topSearches', () => getTopSearches(sel, includeBots)],
    ['chatMetrics', () => getChatMetrics(f)],
    ['topChatTools', () => getTopChatTools(sel, includeBots)],
    ['topViewedTools', () => getTopViewedTools(f)],
    ['topClickedTools', () => getTopClickedTools(f)],
    ['topSavedTools', () => getTopSavedTools(f)],
    ['topComparedTools', () => getTopComparedTools(f)],
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
