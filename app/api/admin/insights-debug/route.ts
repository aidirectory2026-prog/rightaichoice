// Diagnostic endpoint — runs every helper /admin/insights calls and
// returns per-helper { ok | error } so we can pinpoint which call
// crashes the server render. Admin-gated.

import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/admin/require-admin'
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
} from '@/app/admin/insights/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Result = { name: string; ok: boolean; ms: number; sample?: unknown; error?: string }

async function run<T>(name: string, fn: () => Promise<T>): Promise<Result> {
  const t0 = Date.now()
  try {
    const r = await fn()
    const sample = Array.isArray(r)
      ? { length: r.length, first: r[0] ?? null }
      : r
    return { name, ok: true, ms: Date.now() - t0, sample }
  } catch (e) {
    const err = e as Error
    // P2 (Cowork QA): don't return the stack trace in the JSON response (leaks
    // file paths / internals). The name + message is enough for admin debugging.
    return { name, ok: false, ms: Date.now() - t0, error: `${err.name}: ${err.message}` }
  }
}

export async function GET(req: NextRequest) {
  const gate = await checkAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 })

  const sel = parseRange({ days: '7' })
  const includeBots = false
  // Range+bots only — no optional filters on the diagnostic endpoint.
  const f = baseFilters(sel, includeBots)

  const results = await Promise.all([
    run('getBotShare', () => getBotShare(f)),
    run('getOverviewMetrics', () => getOverviewMetrics(f)),
    run('getDailyActiveUsers', () => getDailyActiveUsers(f)),
    run('getPageViewsByDevice', () => getPageViewsByDevice(f)),
    run('getTopReferrers', () => getTopReferrers(f)),
    run('getPlanFunnel', () => getPlanFunnel(f)),
    run('getTopExistingTools', () => getTopExistingTools(f)),
    run('getTopUseCases', () => getTopUseCases(f)),
    run('getEngagementMetrics', () => getEngagementMetrics(f)),
    run('getTopEvents', () => getTopEvents(f)),
    run('getSearchMetrics', () => getSearchMetrics(f)),
    run('getTopSearches', () => getTopSearches(f)),
    run('getChatMetrics', () => getChatMetrics(f)),
    run('getTopChatTools', () => getTopChatTools(f)),
    run('getTopViewedTools', () => getTopViewedTools(f)),
    run('getTopClickedTools', () => getTopClickedTools(f)),
    run('getTopSavedTools', () => getTopSavedTools(f)),
    run('getTopComparedTools', () => getTopComparedTools(f)),
  ])

  const failures = results.filter((r) => !r.ok)
  return NextResponse.json(
    {
      ok: failures.length === 0,
      failed_count: failures.length,
      passed_count: results.length - failures.length,
      failures,
      results,
      query: { days: sel.days, includeBots, url: req.url },
    },
    { status: failures.length === 0 ? 200 : 500 },
  )
}
