// Diagnostic endpoint — runs every helper /admin/insights calls and
// returns per-helper { ok | error } so we can pinpoint which call
// crashes the server render. Admin-gated.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  const sel = parseRange({ days: '7' })
  const includeBots = false

  const results = await Promise.all([
    run('getBotShare', () => getBotShare(sel)),
    run('getOverviewMetrics', () => getOverviewMetrics(sel, includeBots)),
    run('getDailyActiveUsers', () => getDailyActiveUsers(sel, includeBots)),
    run('getPageViewsByDevice', () => getPageViewsByDevice(sel, includeBots)),
    run('getTopReferrers', () => getTopReferrers(sel, includeBots)),
    run('getPlanFunnel', () => getPlanFunnel(sel, includeBots)),
    run('getTopExistingTools', () => getTopExistingTools(sel, includeBots)),
    run('getTopUseCases', () => getTopUseCases(sel, includeBots)),
    run('getEngagementMetrics', () => getEngagementMetrics(sel, includeBots)),
    run('getTopEvents', () => getTopEvents(sel, includeBots)),
    run('getSearchMetrics', () => getSearchMetrics(sel, includeBots)),
    run('getTopSearches', () => getTopSearches(sel, includeBots)),
    run('getChatMetrics', () => getChatMetrics(sel, includeBots)),
    run('getTopChatTools', () => getTopChatTools(sel, includeBots)),
    run('getTopViewedTools', () => getTopViewedTools(sel, includeBots)),
    run('getTopClickedTools', () => getTopClickedTools(sel, includeBots)),
    run('getTopSavedTools', () => getTopSavedTools(sel, includeBots)),
    run('getTopComparedTools', () => getTopComparedTools(sel, includeBots)),
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
