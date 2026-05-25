// Diagnostic endpoint — runs every helper /admin/insights calls and
// returns per-helper { ok | error } so we can pinpoint which call
// crashes the server render. Admin-gated.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
} from '@/app/admin/insights/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function requireAdmin(): Promise<{ ok: boolean; reason?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'Not signed in' }
  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user.id).single()
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) return { ok: false, reason: 'Not admin' }
  return { ok: true }
}

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
    return { name, ok: false, ms: Date.now() - t0, error: `${err.name}: ${err.message}\n${err.stack ?? ''}` }
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 })

  const days: DayWindow = 7
  const includeBots = false

  const results = await Promise.all([
    run('getBotShare', () => getBotShare(days)),
    run('getOverviewMetrics', () => getOverviewMetrics(days, includeBots)),
    run('getDailyActiveUsers', () => getDailyActiveUsers(days, includeBots)),
    run('getPageViewsByDevice', () => getPageViewsByDevice(days, includeBots)),
    run('getTopReferrers', () => getTopReferrers(days, includeBots)),
    run('getPlanFunnel', () => getPlanFunnel(days, includeBots)),
    run('getTopExistingTools', () => getTopExistingTools(days, includeBots)),
    run('getTopUseCases', () => getTopUseCases(days, includeBots)),
    run('getEngagementMetrics', () => getEngagementMetrics(days, includeBots)),
    run('getTopEvents', () => getTopEvents(days, includeBots)),
    run('getSearchMetrics', () => getSearchMetrics(days, includeBots)),
    run('getTopSearches', () => getTopSearches(days, includeBots)),
    run('getChatMetrics', () => getChatMetrics(days, includeBots)),
    run('getTopChatTools', () => getTopChatTools(days, includeBots)),
    run('getTopViewedTools', () => getTopViewedTools(days, includeBots)),
    run('getTopClickedTools', () => getTopClickedTools(days, includeBots)),
    run('getTopSavedTools', () => getTopSavedTools(days, includeBots)),
    run('getTopComparedTools', () => getTopComparedTools(days, includeBots)),
  ])

  const failures = results.filter((r) => !r.ok)
  return NextResponse.json(
    {
      ok: failures.length === 0,
      failed_count: failures.length,
      passed_count: results.length - failures.length,
      failures,
      results,
      query: { days, includeBots, url: req.url },
    },
    { status: failures.length === 0 ? 200 : 500 },
  )
}
