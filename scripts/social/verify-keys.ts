/**
 * One-off key health check (non-destructive). Verifies X (read-only) + Resend (one
 * test email to the owner). Other integrations are confirmed by the live
 * pipeline_runs history. Run: npm run social:verify-keys
 */
export {}

import { getAdminClient } from '../../lib/cron/supabase-admin'

const OWNER = 'tanmayverma321@gmail.com'
const FROM = process.env.ALERT_FROM_EMAIL ?? 'alerts@rightaichoice.com'

async function verifyX() {
  const db = getAdminClient()
  const res = (await db.from('social_accounts').select('access_token, token_expires_at, status, display_name').eq('platform', 'x').maybeSingle()) as {
    data: { access_token: string | null; token_expires_at: string | null; status: string; display_name: string | null } | null
  }
  if (!res.data?.access_token) return console.log('X: ✗ no connected account/token in DB')
  const exp = res.data.token_expires_at ? new Date(res.data.token_expires_at) : null
  const expNote = exp ? (exp.getTime() > Date.now() ? `token valid until ${exp.toISOString()}` : `TOKEN EXPIRED ${exp.toISOString()}`) : 'no expiry recorded'
  const r = await fetch('https://api.twitter.com/2/users/me', { headers: { Authorization: `Bearer ${res.data.access_token}` } })
  if (r.ok) {
    const j = (await r.json()) as { data?: { username?: string } }
    console.log(`X: ✓ token works — authenticated as @${j.data?.username ?? '?'} (status=${res.data.status}, ${expNote})`)
  } else {
    console.log(`X: ✗ /users/me → HTTP ${r.status} ${(await r.text()).slice(0, 160)} (${expNote})`)
  }
}

async function verifyResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return console.log('Resend: ✗ RESEND_API_KEY not in env')
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: OWNER,
      subject: 'RightAIChoice — key health test ✓',
      html: '<p>If you received this, your <b>Resend</b> key is working. Sent by the key-health check.</p>',
    }),
  })
  if (r.ok) {
    const j = (await r.json()) as { id?: string }
    console.log(`Resend: ✓ test email sent to ${OWNER} (id ${j.id ?? '?'}) — check your inbox`)
  } else {
    console.log(`Resend: ✗ HTTP ${r.status} ${(await r.text()).slice(0, 200)}`)
  }
}

async function main() {
  console.log('\n=== Key health check ===')
  await verifyX()
  await verifyResend()
  console.log('')
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
