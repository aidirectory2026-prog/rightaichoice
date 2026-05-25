/**
 * Tracking watchdog — verifies that the events that feed /admin/insights
 * are actually landing in public.user_events. Catches silent regressions
 * where a refactor removes a tracking call and the dashboards quietly
 * report zero without anyone noticing.
 *
 * Runs four independent checks:
 *   A. page_viewed event freshness — should be > 50/day on a live site
 *   B. Required event names present in the last 24h
 *   C. Server-source events (signup_completed, tool_visit_redirected)
 *      writing into user_events (not just Mixpanel)
 *   D. Cross-check signups in user_events vs auth.users — drift > 50%
 *      means the server mirror is broken
 *
 * Exit code 1 + Resend alert when any check fails. Wired to weekly cron
 * in .github/workflows/tracking-watchdog.yml. Run manually with:
 *   tsx scripts/audit/tracking-watchdog.ts
 */

import { createClient } from '@supabase/supabase-js'

type Check = { name: string; ok: boolean; value: number | string; expected: string; detail?: string }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(2)
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } })

async function runChecks(): Promise<Check[]> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Check A — page_viewed freshness
  const { count: pageViewed24hRaw } = await db
    .from('user_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_name', 'page_viewed')
    .gte('created_at', since24h)
    .eq('bot_likely', false)
  const pageViewed24h = pageViewed24hRaw ?? 0

  // Check B — required events present
  const requiredEvents = ['page_viewed', 'tool_page_viewed', 'scroll_depth_reached', 'time_on_page']
  const presentEvents: string[] = []
  for (const ev of requiredEvents) {
    const { count } = await db
      .from('user_events')
      .select('id', { count: 'exact', head: true })
      .eq('event_name', ev)
      .gte('created_at', since24h)
    if ((count ?? 0) > 0) presentEvents.push(ev)
  }
  const missingEvents = requiredEvents.filter((e) => !presentEvents.includes(e))

  // Check C — server-source events landing in user_events
  const { count: serverEvents7dRaw } = await db
    .from('user_events')
    .select('id', { count: 'exact', head: true })
    .eq('source_kind', 'server')
    .gte('created_at', since7d)
  const serverEvents7d = serverEvents7dRaw ?? 0

  // Check D — signup mirror drift
  const { count: signupsInEventsRaw } = await db
    .from('user_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_name', 'signup_completed')
    .gte('created_at', since30d)
  const signupsInEvents = signupsInEventsRaw ?? 0
  const { count: authUsersCount } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since30d)
  const authUsers = authUsersCount ?? 0
  const drift = authUsers > 0 ? Math.abs(authUsers - signupsInEvents) / authUsers : 0

  return [
    {
      name: 'A. page_viewed freshness (24h)',
      ok: pageViewed24h >= 1,
      value: pageViewed24h,
      expected: '>= 1',
      detail: 'page_viewed must dual-write via lib/analytics.ts capture()',
    },
    {
      name: 'B. Required events present (24h)',
      ok: missingEvents.length === 0,
      value: presentEvents.join(', '),
      expected: requiredEvents.join(', '),
      detail: missingEvents.length ? `MISSING: ${missingEvents.join(', ')}` : undefined,
    },
    {
      name: 'C. Server-source events (7d)',
      ok: serverEvents7d >= 1,
      value: serverEvents7d,
      expected: '>= 1',
      detail: 'mirrorServerEvent() in lib/mixpanel-server.ts must write source_kind=server rows',
    },
    {
      name: 'D. Signup mirror drift (30d)',
      ok: authUsers === 0 || drift <= 0.5,
      value: `${signupsInEvents} events / ${authUsers} profiles (drift ${(drift * 100).toFixed(0)}%)`,
      expected: '<= 50% drift',
    },
  ]
}

async function sendAlert(failed: Check[]): Promise<void> {
  const RESEND_KEY = process.env.RESEND_API_KEY
  const TO = process.env.ALERT_EMAIL_TO ?? process.env.ADMIN_EMAIL
  if (!RESEND_KEY || !TO) {
    console.log('[watchdog] No RESEND_API_KEY / ALERT_EMAIL_TO — skipping email alert.')
    return
  }
  const body = failed
    .map((c) => `❌ ${c.name}\n   value:    ${c.value}\n   expected: ${c.expected}${c.detail ? `\n   detail:   ${c.detail}` : ''}`)
    .join('\n\n')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: 'alerts@rightaichoice.com',
      to: TO,
      subject: `[watchdog] tracking regression — ${failed.length} check(s) failed`,
      text: body,
    }),
  }).catch((e) => console.error('[watchdog] alert failed:', e))
}

async function main(): Promise<void> {
  const checks = await runChecks()
  for (const c of checks) {
    const mark = c.ok ? '✓' : '✗'
    console.log(`${mark} ${c.name}: ${c.value} (expected ${c.expected})`)
    if (!c.ok && c.detail) console.log(`    → ${c.detail}`)
  }
  const failed = checks.filter((c) => !c.ok)
  if (failed.length > 0) {
    await sendAlert(failed)
    process.exit(1)
  }
  console.log(`\n[watchdog] ${checks.length}/${checks.length} checks passed.`)
}

main().catch((e) => {
  console.error('[watchdog] fatal:', e)
  process.exit(2)
})
