/**
 * Smoke test — verifies service-account auth and ingestion both work.
 * Run: tsx scripts/mixpanel/verify.ts
 */
export {}

const PROJECT_ID = process.env.MIXPANEL_PROJECT_ID
const USERNAME = process.env.MIXPANEL_SERVICE_ACCOUNT_USERNAME
const SECRET = process.env.MIXPANEL_SERVICE_ACCOUNT_SECRET
const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
const HOST = process.env.MIXPANEL_API_HOST || 'https://eu.mixpanel.com'
const DATA_HOST = process.env.MIXPANEL_DATA_API_HOST || 'https://api-eu.mixpanel.com'

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
