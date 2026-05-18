// Phase 8.d.10 (2026-05-18) — failure-alert dispatcher.
//
// Every 30 min: finds pipeline_runs where status='failure' AND
// created_at > now() - 35 min AND no row in pipeline_alerts_sent.
// Sends email via Resend (if RESEND_API_KEY + ALERT_EMAIL set) and
// optionally posts to Slack (if SLACK_WEBHOOK_URL set). Each delivery
// records a pipeline_alerts_sent row keyed by pipeline_run_id (UNIQUE)
// so the next cron fire doesn't re-alert.
//
// The cron itself wraps in withPipelineLogging so an alert delivery
// failure is itself visible in Knowledge Room (recursive but useful —
// you'd want to know if alerts are broken).
//
// REQUIRED VERCEL ENV (cron is no-op without these):
//   RESEND_API_KEY      — https://resend.com/api-keys
//   ALERT_EMAIL         — recipient (your operator inbox)
//   ALERT_FROM_EMAIL    — optional, default 'alerts@rightaichoice.com'
// OPTIONAL:
//   SLACK_WEBHOOK_URL   — incoming webhook URL for parallel Slack delivery

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60

const ALERT_LOOKBACK_MS = 35 * 60 * 1000
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? 'alerts@rightaichoice.com'

type FailedRun = {
  id: string
  pipeline_key: string
  source: 'vercel_cron' | 'gh_actions'
  status: string
  error_message: string | null
  error_class: string | null
  started_at: string
  metadata: Record<string, unknown> | null
}

async function sendEmail(run: FailedRun): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL
  if (!apiKey || !to) return { ok: false, error: 'RESEND_API_KEY or ALERT_EMAIL not set' }

  const subject = `[RAC alert] ${run.pipeline_key} failed (${run.error_class ?? 'unknown'})`
  const errExcerpt = (run.error_message ?? '(no message)').slice(0, 500)
  const failedStep = (run.metadata as { failed_step?: string } | null)?.failed_step
  const logUrl = (run.metadata as { log_url?: string; html_url?: string } | null)?.log_url ??
    (run.metadata as { html_url?: string } | null)?.html_url

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#1f2937;max-width:560px">
      <h2 style="color:#dc2626;margin:0 0 8px;font-size:16px">Pipeline failure: ${escapeHtml(run.pipeline_key)}</h2>
      <p style="margin:0 0 12px;color:#6b7280">${escapeHtml(run.source)} · ${escapeHtml(run.error_class ?? 'unknown')} · ${new Date(run.started_at).toISOString().slice(0, 19)} UTC</p>
      ${failedStep ? `<p style="margin:0 0 12px"><strong>Failed step:</strong> ${escapeHtml(failedStep)}</p>` : ''}
      <pre style="background:#f3f4f6;padding:12px;border-radius:6px;white-space:pre-wrap;font-size:12px;line-height:1.4">${escapeHtml(errExcerpt)}</pre>
      <p style="margin:16px 0 0">
        <a href="https://rightaichoice.com/admin/updates?range=today#run-${run.id}" style="color:#059669;text-decoration:none">→ View in Knowledge Room</a>
        ${logUrl ? `<span style="color:#d1d5db"> · </span><a href="${escapeHtml(logUrl)}" style="color:#059669;text-decoration:none">→ View logs</a>` : ''}
      </p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    return { ok: false, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` }
  }
  return { ok: true }
}

async function sendSlack(run: FailedRun): Promise<{ ok: boolean; error?: string }> {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return { ok: false, error: 'SLACK_WEBHOOK_URL not set' }

  const errExcerpt = (run.error_message ?? '(no message)').slice(0, 400)
  const failedStep = (run.metadata as { failed_step?: string } | null)?.failed_step

  const text = [
    `:rotating_light: *${run.pipeline_key}* failed (${run.error_class ?? 'unknown'})`,
    `${run.source} · ${new Date(run.started_at).toISOString().slice(0, 19)} UTC`,
    failedStep ? `_failed step: ${failedStep}_` : '',
    '```' + errExcerpt + '```',
    `<https://rightaichoice.com/admin/updates?range=today#run-${run.id}|→ Knowledge Room>`,
  ]
    .filter(Boolean)
    .join('\n')

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    return { ok: false, error: `Slack HTTP ${res.status}` }
  }
  return { ok: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const POST = cronRoute({ pipelineKey: 'alert-failed-pipelines' }, async (ctx) => {
  const db = getAdminClient()
  const since = new Date(Date.now() - ALERT_LOOKBACK_MS).toISOString()

  // Pull recent failures.
  const { data: failures, error: failErr } = await db
    .from('pipeline_runs')
    .select('id, pipeline_key, source, status, error_message, error_class, started_at, metadata')
    .in('status', ['failure', 'timeout'])
    .gte('created_at', since)
    .limit(100)
  if (failErr) throw new Error(`fetch failures: ${failErr.message}`)
  const all = (failures ?? []) as unknown as FailedRun[]
  if (all.length === 0) {
    ctx.recordMetadata({ skipped: 'no_recent_failures' })
    return { ok: true, alerted: 0, skipped_dedup: 0 }
  }

  // Filter out already-alerted ones.
  const ids = all.map((r) => r.id)
  const { data: alreadySent } = await db
    .from('pipeline_alerts_sent')
    .select('pipeline_run_id')
    .in('pipeline_run_id', ids)
  const sentSet = new Set(((alreadySent ?? []) as Array<{ pipeline_run_id: string }>).map((r) => r.pipeline_run_id))
  const toAlert = all.filter((r) => !sentSet.has(r.id))

  let alerted = 0
  const deliveryErrors: Array<{ run_id: string; channel: string; error: string }> = []
  const hasSlack = !!process.env.SLACK_WEBHOOK_URL

  for (const run of toAlert) {
    const emailRes = await sendEmail(run)
    const slackRes = hasSlack ? await sendSlack(run) : { ok: false, error: 'no_webhook' }

    if (!emailRes.ok) deliveryErrors.push({ run_id: run.id, channel: 'email', error: emailRes.error ?? 'unknown' })
    if (hasSlack && !slackRes.ok) deliveryErrors.push({ run_id: run.id, channel: 'slack', error: slackRes.error ?? 'unknown' })

    // Only insert the dedup row if AT LEAST ONE delivery channel succeeded —
    // otherwise we'd silently never retry.
    if (emailRes.ok || slackRes.ok) {
      const channel = emailRes.ok && slackRes.ok ? 'both' : emailRes.ok ? 'email' : 'slack'
      await db
        .from('pipeline_alerts_sent')
        .insert({ pipeline_run_id: run.id, channel } as never)
      alerted++
    }
  }

  ctx.recordItems({ processed: toAlert.length, succeeded: alerted, failed: toAlert.length - alerted })
  ctx.recordMetadata({
    recent_failures: all.length,
    skipped_dedup: all.length - toAlert.length,
    delivery_errors: deliveryErrors.slice(0, 10),
  })

  return {
    ok: true,
    recent_failures: all.length,
    skipped_dedup: all.length - toAlert.length,
    alerted,
    delivery_errors: deliveryErrors.slice(0, 10),
  }
})
