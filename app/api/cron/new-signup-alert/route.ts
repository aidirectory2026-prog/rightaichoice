// Phase 11.1 (2026-06-18) — new-signup alert. So you never miss a registration:
// every run finds accounts in auth.users with no row in signup_alerts_sent (i.e.
// brand-new signups), emails you a digest (Resend) + optional Slack, and records
// them so they're never re-alerted. Reads auth.users directly, so it catches a
// signup even if its analytics event never fired.
//
// REQUIRED VERCEL ENV (cron is a no-op without these):
//   RESEND_API_KEY    — https://resend.com/api-keys
//   ALERT_EMAIL       — recipient (falls back to ALERT_EMAIL_TO / ADMIN_EMAIL / owner)
// OPTIONAL:
//   ALERT_FROM_EMAIL  — default 'alerts@rightaichoice.com'
//   SLACK_WEBHOOK_URL — parallel Slack delivery

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60

const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? 'alerts@rightaichoice.com'
const OWNER_FALLBACK = 'tanmayverma321@gmail.com'

type Member = {
  user_id: string
  email: string | null
  full_name: string | null
  provider: string | null
  signed_up: string
  distinct_id: string | null
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

async function sendEmail(newbies: Member[]): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL ?? process.env.ALERT_EMAIL_TO ?? process.env.ADMIN_EMAIL ?? OWNER_FALLBACK
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }

  const rows = newbies.map((m) => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee"><strong>${escapeHtml(m.email ?? m.full_name ?? 'new member')}</strong>${m.full_name && m.email ? ` <span style="color:#6b7280">(${escapeHtml(m.full_name)})</span>` : ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">${escapeHtml(m.provider ?? 'email')}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">${new Date(m.signed_up).toISOString().slice(0, 16).replace('T', ' ')} UTC</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${m.distinct_id ? `<a href="https://rightaichoice.com/admin/insights/user/${encodeURIComponent(m.distinct_id)}" style="color:#059669">View journey →</a>` : ''}</td>
    </tr>`).join('')

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#1f2937;max-width:640px">
      <h2 style="color:#059669;margin:0 0 8px;font-size:16px">🎉 ${newbies.length} new signup${newbies.length > 1 ? 's' : ''} on RightAIChoice</h2>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead><tr style="text-align:left;color:#6b7280">
          <th style="padding:6px 10px">Member</th><th style="padding:6px 10px">Via</th><th style="padding:6px 10px">When</th><th style="padding:6px 10px"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:16px 0 0"><a href="https://rightaichoice.com/admin/insights/members" style="color:#059669;text-decoration:none">→ See all members</a></p>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject: `🎉 ${newbies.length} new signup${newbies.length > 1 ? 's' : ''} — RightAIChoice`, html }),
  })
  if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` }
  return { ok: true }
}

async function sendSlack(newbies: Member[]): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return
  const lines = newbies.map((m) => `• *${m.email ?? m.full_name ?? 'new member'}* via ${m.provider ?? 'email'}`).join('\n')
  await fetch(webhook, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: `🎉 ${newbies.length} new signup(s) on RightAIChoice\n${lines}\nhttps://rightaichoice.com/admin/insights/members` }),
  }).catch(() => { /* best-effort */ })
}

export const GET = cronRoute({ pipelineKey: 'new-signup-alert' }, async (ctx) => {
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: members } = await (db as any).rpc('insights_registered_users')
  const all = (members ?? []) as Member[]
  const { data: alertedRows } = await db.from('signup_alerts_sent').select('user_id')
  const alerted = new Set(((alertedRows ?? []) as { user_id: string }[]).map((r) => r.user_id))

  const newbies = all.filter((m) => !alerted.has(m.user_id))
  ctx.recordMetadata({ new_signups: newbies.length })
  if (newbies.length === 0) return { ok: true, new_signups: 0 }

  const emailResult = await sendEmail(newbies)
  await sendSlack(newbies)

  // Record as alerted regardless of email outcome — we never want to spam the
  // same signup on the next run; a delivery failure is surfaced via the pipeline log.
  await db.from('signup_alerts_sent').upsert(
    newbies.map((m) => ({ user_id: m.user_id })) as never,
    { onConflict: 'user_id', ignoreDuplicates: true },
  )

  if (!emailResult.ok) throw new Error(`new-signup alert email failed: ${emailResult.error}`)
  return { ok: true, new_signups: newbies.length }
})
