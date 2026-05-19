/**
 * Smoke test — verifies service-account auth and ingestion both work.
 * Run: tsx scripts/mixpanel/verify.ts
 *      tsx scripts/mixpanel/verify.ts --full   (Phase 8.g.6: also checks
 *      event-property values for the top max-capture events from the last 24h
 *      to confirm new instrumentation is producing data.)
 *
 * The deeper "Mixpanel vs Supabase DB" reconciliation audit (delta thresholds
 * for tool_visit_redirected/click_logs, search_query_submitted/search_logs,
 * page_viewed/page_views, signup_completed/auth.users) is documented in
 * docs/marketing/mixpanel-plan.md → Verification. It requires both
 * production traffic AND Supabase admin access; run it 24h after first
 * deploy of Phase 8.g.
 */
export {}

const PROJECT_ID = process.env.MIXPANEL_PROJECT_ID
const USERNAME = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME
const SECRET = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET
const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
const HOST = process.env.MIXPANEL_API_HOST || 'https://eu.mixpanel.com'
const DATA_HOST = process.env.MIXPANEL_DATA_API_HOST || 'https://api-eu.mixpanel.com'

// Phase 8.g.6 — the events the audit cares about most (max-capture events
// from g.2 that need real-traffic validation).
const FULL_AUDIT_EVENTS = [
  'plan_intake_submitted',
  'plan_chip_selected',
  'plan_existing_tool_added',
  'plan_results_displayed',
  'plan_results_tool_clicked',
  'search_typing',
  'tool_faq_opened',
  'ai_chat_message',
  'ai_chat_response_received',
  'review_form_opened',
  'review_rating_set',
  'review_submitted',
  'compare_tray_opened',
  'tool_saved',
  'tool_visit_redirected',
  'signup_completed',
  'newsletter_subscribed',
]

async function main() {
  const rows: Array<{ check: string; status: 'ok' | 'fail'; detail: string }> = []

  // 1. Env presence
  const missing = Object.entries({ PROJECT_ID, USERNAME, SECRET, TOKEN }).filter(([, v]) => !v)
  rows.push({
    check: 'env vars present',
    status: missing.length === 0 ? 'ok' : 'fail',
    detail: missing.length === 0 ? 'all set' : `missing: ${missing.map(([k]) => k).join(', ')}`,
  })

  // 2. Service account auth (schemas endpoint is free-tier friendly)
  if (PROJECT_ID && USERNAME && SECRET) {
    const auth = Buffer.from(`${USERNAME}:${SECRET}`).toString('base64')
    const res = await fetch(`${HOST}/api/app/projects/${PROJECT_ID}/schemas`, {
      headers: { authorization: `Basic ${auth}` },
    })
    rows.push({
      check: 'service account auth',
      status: res.ok ? 'ok' : 'fail',
      detail: `HTTP ${res.status}`,
    })
  }

  // 3. Ingestion — fire a smoke event
  if (TOKEN) {
    const payload = {
      event: 'claude_smoke_test',
      properties: {
        token: TOKEN,
        distinct_id: 'claude-verify-script',
        source: 'verify.ts',
        time: Math.floor(Date.now() / 1000),
      },
    }
    const body = new URLSearchParams({
      data: Buffer.from(JSON.stringify(payload)).toString('base64'),
    })
    const res = await fetch(`${DATA_HOST}/track?verbose=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = (await res.json().catch(() => ({}))) as { status?: number; error?: string }
    rows.push({
      check: 'ingestion (/track)',
      status: json.status === 1 ? 'ok' : 'fail',
      detail: json.status === 1 ? '1 event accepted' : `${res.status} ${json.error ?? 'unknown'}`,
    })
  }

  // Phase 8.g.6 — optional --full audit: per-event presence check using
  // the Mixpanel events properties endpoint (free-tier). For each event in
  // FULL_AUDIT_EVENTS, fetch its property values over the last 24h. A
  // non-200 response or empty body means the event hasn't fired in 24h.
  const wantsFull = process.argv.includes('--full')
  if (wantsFull && PROJECT_ID && USERNAME && SECRET) {
    const auth = Buffer.from(`${USERNAME}:${SECRET}`).toString('base64')
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    console.log('\n── Phase 8.g.6 event-presence audit (last 24h) ──')
    for (const eventName of FULL_AUDIT_EVENTS) {
      const url = `${HOST}/api/2.0/events/properties/top?event=${encodeURIComponent(eventName)}&from_date=${yesterday}&to_date=${today}&project_id=${PROJECT_ID}`
      try {
        const res = await fetch(url, { headers: { authorization: `Basic ${auth}` } })
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
        const hasData = res.ok && Object.keys(json).length > 0
        const icon = hasData ? '✓' : '⚠'
        const note = hasData ? 'firing' : `no events in window (HTTP ${res.status})`
        console.log(`  ${icon}  ${eventName.padEnd(32)}  ${note}`)
      } catch (e) {
        console.log(`  ✗  ${eventName.padEnd(32)}  query error: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
    console.log('')
    console.log('Reminder: the full Mixpanel-vs-DB delta audit (with thresholds')
    console.log('per docs/marketing/mixpanel-plan.md) needs Supabase access and')
    console.log('24h of post-deploy traffic. Run separately.')
  }

  console.log('\nMixpanel verification:\n')
  for (const r of rows) {
    const icon = r.status === 'ok' ? '✓' : '✗'
    console.log(`  ${icon}  ${r.check.padEnd(28)}  ${r.detail}`)
  }
  const anyFail = rows.some((r) => r.status === 'fail')
  if (anyFail) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
