// Phase 13 Social — daily approval digest. Emails (Resend) + Slacks the founder
// the posts awaiting approval, with a one-click link to the queue. So nothing
// sits un-reviewed. No-op (logged) when nothing is pending.
//
// REQUIRED VERCEL ENV: RESEND_API_KEY · ALERT_EMAIL (falls back to owner)
// OPTIONAL: ALERT_FROM_EMAIL · SLACK_WEBHOOK_URL · SOCIAL_PUBLIC_ORIGIN

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? 'alerts@rightaichoice.com'
const OWNER_FALLBACK = 'tanmayverma321@gmail.com'
const ORIGIN = process.env.SOCIAL_PUBLIC_ORIGIN ?? 'https://rightaichoice.com'

type Pending = { id: string; platform: string; kind: string; copy: string; scheduled_at: string | null }

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

async function sendEmail(pending: Pending[]): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL ?? process.env.ALERT_EMAIL_TO ?? process.env.ADMIN_EMAIL ?? OWNER_FALLBACK
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }
  const rows = pending
    .map(
      (p) => `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee"><strong>${escapeHtml(p.platform)}</strong> <span style="color:#6b7280">${escapeHtml(p.kind)}</span></td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${escapeHtml(p.copy.slice(0, 120))}${p.copy.length > 120 ? '…' : ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#6b7280">${p.scheduled_at ? new Date(p.scheduled_at).toISOString().slice(0, 16).replace('T', ' ') : '—'}</td>
    </tr>`,
    )
    .join('')
  const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#1f2937;max-width:680px">
      <h2 style="color:#059669;margin:0 0 8px;font-size:16px">📋 ${pending.length} social post${pending.length > 1 ? 's' : ''} awaiting your approval</h2>
      <table style="border-collapse:collapse;width:100%;font-size:13px"><tbody>${rows}</tbody></table>
      <p style="margin:16px 0 0"><a href="${ORIGIN}/admin/social" style="color:#059669;text-decoration:none">→ Review &amp; approve in the queue</a></p>
      <p style="color:#9ca3af;font-size:12px;margin-top:8px">Nothing posts until you approve it.</p>
    </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject: `📋 ${pending.length} social post${pending.length > 1 ? 's' : ''} to approve — RightAIChoice`, html }),
  })
  if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}` }
  return { ok: true }
}

async function sendSlack(pending: Pending[]): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return
  const lines = pending.map((p) => `• *${p.platform}* (${p.kind}): ${p.copy.slice(0, 80)}`).join('\n')
  await fetch(webhook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: `📋 ${pending.length} social post(s) awaiting approval\n${lines}\n${ORIGIN}/admin/social` }),
  }).catch(() => {})
}

export const GET = cronRoute({ pipelineKey: 'social-approval-digest' }, async (ctx) => {
  const db = getAdminClient()
  const res = await db
    .from('social_posts')
    .select('id, platform, kind, copy, scheduled_at')
    .eq('status', 'draft')
    .order('scheduled_at', { ascending: true })
    .limit(50)
  const pending = (res.data ?? []) as Pending[]
  ctx.recordMetadata({ pending: pending.length })
  if (pending.length === 0) return { ok: true, pending: 0 }

  const email = await sendEmail(pending)
  await sendSlack(pending)
  ctx.recordMetadata({ pending: pending.length, email_ok: email.ok, email_error: email.error ?? null })
  if (!email.ok) ctx.setStatus('partial')
  return { pending: pending.length, email_ok: email.ok }
})
