import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

// Phase 9 Day-4 Part 2 (2026-05-29) — Monday morning SEO digest email.
//
// Runs every Monday at 08:00 UTC, ~1h after triage-gsc lands its
// 'proposed' rows in weekly_loop_actions. Reads:
//   1. This week's proposed actions (top 10 by priority).
//   2. Latest gsc_diffs totals for both 7d + 28d (WoW summary).
//
// Sends a Resend HTML email to ALERT_EMAIL with:
//   - Headline WoW summary (clicks / impr / CTR / pos delta).
//   - Top-10 actions, each with priority badge + 1-line rationale.
//   - Deep-link to /admin/seo-pulse for review/accept/reject.
//
// Why email + admin page (not a Claude Code skill): laptop-off operation.
// The operator gets the Monday digest in their inbox; opens /admin/seo-pulse
// from any device to accept/reject. No CLI required.
//
// REQUIRED VERCEL ENV (no-op without these):
//   RESEND_API_KEY      — https://resend.com/api-keys
//   ALERT_EMAIL         — operator inbox (same one alerts use)
//   ALERT_FROM_EMAIL    — optional, default 'alerts@rightaichoice.com'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? 'alerts@rightaichoice.com'
const SITE = 'https://rightaichoice.com'
const TOP_N = 10

type Priority = 'critical' | 'high' | 'medium' | 'low'

type ActionRow = {
  id: string
  page: string
  action_type: string
  priority: Priority
  reason: string
  snapshot_date: string
  metadata: Record<string, unknown> | null
}

type DiffTotals = {
  scope: '7d' | '28d'
  to_date: string
  signals_count: number
  winners_count: number
  losers_count: number
  new_pairs_count: number
  lost_pairs_count: number
}

type SnapshotTotals = {
  scope: '7d' | '28d'
  snapshot_date: string
  totals: { clicks?: number; impressions?: number; ctr?: number; position?: number }
}

const PRIORITY_RANK: Record<Priority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

// ── DB loaders ──────────────────────────────────────────────────────

async function loadProposed(): Promise<ActionRow[]> {
  const db = getAdminClient()
  // Latest snapshot_date among proposed rows = this week's batch.
  const { data: latest } = await db
    .from('weekly_loop_actions')
    .select('snapshot_date')
    .eq('status', 'proposed')
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const week = (latest as { snapshot_date: string } | null)?.snapshot_date
  if (!week) return []
  const { data, error } = await db
    .from('weekly_loop_actions')
    .select('id, page, action_type, priority, reason, snapshot_date, metadata')
    .eq('status', 'proposed')
    .eq('snapshot_date', week)
  if (error) throw new Error(`load proposed actions: ${error.message}`)
  return (data ?? []) as unknown as ActionRow[]
}

async function loadDiffTotals(): Promise<DiffTotals[]> {
  const db = getAdminClient()
  const out: DiffTotals[] = []
  for (const scope of ['7d', '28d'] as const) {
    const { data, error } = await db
      .from('gsc_diffs')
      .select('to_date, signals_count, winners_count, losers_count, new_pairs_count, lost_pairs_count')
      .eq('scope', scope)
      .order('to_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`load diff totals (${scope}): ${error.message}`)
    if (data) out.push({ scope, ...(data as Omit<DiffTotals, 'scope'>) })
  }
  return out
}

async function loadSnapshotPair(scope: '7d' | '28d'): Promise<{ current: SnapshotTotals | null; prior: SnapshotTotals | null }> {
  const db = getAdminClient()
  const { data, error } = await db
    .from('gsc_snapshots')
    .select('snapshot_date, totals')
    .eq('scope', scope)
    .order('snapshot_date', { ascending: false })
    .limit(2)
  if (error) throw new Error(`load snapshots (${scope}): ${error.message}`)
  const list = (data ?? []) as unknown as Array<Omit<SnapshotTotals, 'scope'>>
  return {
    current: list[0] ? { scope, ...list[0] } : null,
    prior: list[1] ? { scope, ...list[1] } : null,
  }
}

type NicheRow = {
  slug: string
  niche: string
  impressions: number
  clicks: number
  avg_position: number | null
  impr_delta_vs_prior: number | null
}

async function loadNicheTracker(): Promise<NicheRow[]> {
  const db = getAdminClient()
  const { data, error } = await db
    .from('niche_page_latest')
    .select('slug, niche, impressions, clicks, avg_position, impr_delta_vs_prior')
    .order('impressions', { ascending: false })
  if (error) throw new Error(`load niche tracker: ${error.message}`)
  return (data ?? []) as unknown as NicheRow[]
}

// ── HTML composition ─────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function priorityBadge(p: Priority): string {
  const color = p === 'critical' ? '#dc2626' : p === 'high' ? '#d97706' : p === 'medium' ? '#0891b2' : '#6b7280'
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${color};color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em">${p}</span>`
}

function fmtDelta(curr: number | undefined, prior: number | undefined, kind: 'count' | 'pct' | 'pos'): string {
  if (curr === undefined || prior === undefined) return '—'
  const delta = curr - prior
  const sign = delta > 0 ? '+' : ''
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '·'
  // For 'pos', a decrease is GOOD (closer to #1). For everything else, increase is good.
  const isGood = kind === 'pos' ? delta < 0 : delta > 0
  const color = delta === 0 ? '#6b7280' : isGood ? '#059669' : '#dc2626'
  if (kind === 'pct') {
    return `<span style="color:${color}">${arrow} ${sign}${(delta * 100).toFixed(2)}pp</span>`
  }
  if (kind === 'pos') {
    return `<span style="color:${color}">${arrow} ${sign}${delta.toFixed(1)}</span>`
  }
  return `<span style="color:${color}">${arrow} ${sign}${delta.toLocaleString()}</span>`
}

function summaryRow(
  label: string,
  pair: { current: SnapshotTotals | null; prior: SnapshotTotals | null },
): string {
  const c = pair.current?.totals
  const p = pair.prior?.totals
  if (!c) return ''
  return `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#1f2937">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#1f2937">${(c.clicks ?? 0).toLocaleString()} ${fmtDelta(c.clicks, p?.clicks, 'count')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#1f2937">${(c.impressions ?? 0).toLocaleString()} ${fmtDelta(c.impressions, p?.impressions, 'count')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#1f2937">${((c.ctr ?? 0) * 100).toFixed(2)}% ${fmtDelta(c.ctr, p?.ctr, 'pct')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#1f2937">${(c.position ?? 0).toFixed(1)} ${fmtDelta(c.position, p?.position, 'pos')}</td>
    </tr>
  `
}

function actionItemHtml(a: ActionRow, scope: string): string {
  const dq = (a.metadata as { dominant_query?: string } | null)?.dominant_query
  return `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top">
        <div style="margin-bottom:6px">${priorityBadge(a.priority)} <span style="color:#6b7280;font-size:12px;margin-left:8px;text-transform:uppercase">${escapeHtml(a.action_type.replace(/_/g, ' '))}</span> <span style="color:#9ca3af;font-size:11px;margin-left:6px">(${scope})</span></div>
        <div style="font-family:ui-monospace,monospace;font-size:13px;color:#0891b2;margin-bottom:4px"><a href="${SITE}${escapeHtml(a.page)}" style="color:#0891b2;text-decoration:none">${escapeHtml(a.page)}</a></div>
        <div style="color:#374151;font-size:13px;line-height:1.5">${escapeHtml(a.reason)}</div>
        ${dq ? `<div style="color:#9ca3af;font-size:11px;margin-top:4px">Dominant query: <em>${escapeHtml(dq)}</em></div>` : ''}
      </td>
    </tr>
  `
}

// Niche-page tracker strip: the 64 niche /best pages (doc 22 Phase B).
// Surfaces the top week-over-week impression gainers so the operator sees
// which niches are warming up without opening /admin/niche-tracker.
function nicheSectionHtml(rows: NicheRow[]): string {
  if (rows.length === 0) return ''
  const withData = rows.filter((r) => r.impressions > 0)
  const totalImpr = rows.reduce((a, r) => a + r.impressions, 0)
  const totalClicks = rows.reduce((a, r) => a + r.clicks, 0)
  const gainers = withData
    .filter((r) => (r.impr_delta_vs_prior ?? 0) > 0)
    .sort((a, b) => (b.impr_delta_vs_prior ?? 0) - (a.impr_delta_vs_prior ?? 0))
    .slice(0, 5)
  const topLine = gainers.length
    ? gainers
        .map(
          (g) =>
            `${escapeHtml(g.niche)} <span style="color:#059669;font-weight:600">+${g.impr_delta_vs_prior}</span>`,
        )
        .join(' &nbsp;·&nbsp; ')
    : 'No week-over-week gainers yet — most niche pages are still pre-index.'
  return `
    <div style="padding:16px 0;border-top:1px solid #e5e7eb">
      <h2 style="margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280">
        Niche pages
        <span style="color:#9ca3af;font-weight:400;text-transform:none;font-size:12px">&nbsp;— ${withData.length}/${rows.length} with data · ${totalImpr.toLocaleString()} impr · ${totalClicks.toLocaleString()} clicks</span>
      </h2>
      <div style="font-size:13px;color:#374151;line-height:1.6">Top gainers: ${topLine}</div>
      <div style="margin-top:10px"><a href="${SITE}/admin/niche-tracker" style="color:#0891b2;text-decoration:none;font-size:13px">→ Open niche tracker</a></div>
    </div>
  `
}

function composeHtml(
  actions: ActionRow[],
  diffTotals: DiffTotals[],
  pairs: { '7d': { current: SnapshotTotals | null; prior: SnapshotTotals | null }; '28d': { current: SnapshotTotals | null; prior: SnapshotTotals | null } },
  snapshotDate: string,
  nicheRows: NicheRow[],
): string {
  const sortedActions = [...actions].sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])
  const top = sortedActions.slice(0, TOP_N)

  const byPriority: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const a of actions) byPriority[a.priority]++

  const diffStrip = diffTotals
    .map((d) => `
      <div style="display:inline-block;padding:8px 14px;background:#f3f4f6;border-radius:6px;margin-right:8px;margin-bottom:6px">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em">${d.scope}</div>
        <div style="font-size:12px;color:#1f2937;margin-top:2px">${d.winners_count} ▲ &nbsp;${d.losers_count} ▼ &nbsp;${d.new_pairs_count} new &nbsp;${d.lost_pairs_count} lost</div>
      </div>
    `)
    .join('')

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#1f2937;max-width:680px;margin:0 auto">
      <div style="padding:24px 0;border-bottom:2px solid #1f2937">
        <h1 style="margin:0;font-size:22px;color:#1f2937">SEO Pulse — ${escapeHtml(snapshotDate)}</h1>
        <p style="margin:6px 0 0;color:#6b7280;font-size:13px">Week-over-week summary + ${top.length} prioritized actions</p>
      </div>

      <div style="padding:20px 0">
        <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280">Site-wide totals</h2>
        <table style="border-collapse:collapse;width:100%;font-size:13px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase">Scope</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase">Clicks</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase">Impressions</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase">CTR</th>
              <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase">Avg pos</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRow('Last 7d', pairs['7d'])}
            ${summaryRow('Last 28d', pairs['28d'])}
          </tbody>
        </table>
      </div>

      <div style="padding:16px 0">
        <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280">Page+query signal mix</h2>
        ${diffStrip || '<p style="color:#9ca3af;font-size:13px">No diff data yet — need 2 weeks of snapshots.</p>'}
      </div>

      <div style="padding:16px 0;border-top:1px solid #e5e7eb">
        <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280">
          Triage queue
          <span style="color:#9ca3af;font-weight:400;text-transform:none;font-size:12px">&nbsp;— ${actions.length} total · ${byPriority.critical} critical, ${byPriority.high} high, ${byPriority.medium} medium, ${byPriority.low} low</span>
        </h2>
        ${top.length === 0
          ? '<p style="color:#9ca3af;font-size:13px">No actions this week. Either every page is on track, or triage rules need tuning.</p>'
          : `<table style="border-collapse:collapse;width:100%">${top.map((a) => actionItemHtml(a, String((a.metadata as { scope?: string } | null)?.scope ?? '—'))).join('')}</table>`
        }
        ${actions.length > TOP_N ? `<p style="color:#6b7280;font-size:12px;margin-top:8px">+ ${actions.length - TOP_N} more in the dashboard.</p>` : ''}
      </div>

      ${nicheSectionHtml(nicheRows)}

      <div style="padding:24px 0;text-align:center;border-top:1px solid #e5e7eb;margin-top:16px">
        <a href="${SITE}/admin/seo-pulse" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">→ Review & accept actions</a>
      </div>

      <div style="padding:16px 0;text-align:center;color:#9ca3af;font-size:11px;border-top:1px solid #f3f4f6;margin-top:24px">
        RightAIChoice SEO Pulse · Generated by triage-gsc + email-weekly-digest crons · Mondays 07:00 + 08:00 UTC
      </div>
    </div>
  `
}

// ── Handler ──────────────────────────────────────────────────────────

export const GET = cronRoute({ pipelineKey: 'email-weekly-digest' }, async (ctx) => {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL
  if (!apiKey || !to) {
    ctx.recordMetadata({ skipped: 'RESEND_API_KEY or ALERT_EMAIL not set' })
    return { ok: true, skipped: 'env_not_configured' }
  }

  const [actions, diffTotals, p7, p28, nicheRows] = await Promise.all([
    loadProposed(),
    loadDiffTotals(),
    loadSnapshotPair('7d'),
    loadSnapshotPair('28d'),
    loadNicheTracker(),
  ])

  // snapshot_date for the subject — use the latest proposed-action date,
  // or fall back to the latest snapshot if the queue is empty.
  const snapshotDate =
    actions[0]?.snapshot_date ??
    p7.current?.snapshot_date ??
    p28.current?.snapshot_date ??
    new Date().toISOString().split('T')[0]

  const byPriority: Record<Priority, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  for (const a of actions) byPriority[a.priority]++

  const subject = `[SEO Pulse] ${snapshotDate} — ${actions.length} actions (${byPriority.critical} critical, ${byPriority.high} high)`
  const html = composeHtml(actions, diffTotals, { '7d': p7, '28d': p28 }, snapshotDate, nicheRows)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend HTTP ${res.status}: ${body.slice(0, 200)}`)
  }

  ctx.recordItems({ processed: 1, succeeded: 1 })
  ctx.recordMetadata({
    snapshot_date: snapshotDate,
    actions_count: actions.length,
    by_priority: byPriority,
    to,
    subject,
  })

  return { ok: true, snapshot_date: snapshotDate, actions_count: actions.length, by_priority: byPriority }
})
