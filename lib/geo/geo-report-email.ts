// Phase 13 D3.4 — weekly GEO citation report email.
//
// After the weekly tracker runs, email the founder a plain summary: are AI
// assistants citing us, for how many target prompts, our rank, share-of-voice,
// the trend vs prior weeks, and which competitors showed up. Reuses the same
// Resend setup + recipient resolution as the other alert crons.

import { loadGeoCitationPanel } from './admin-queries'

const FROM_EMAIL = process.env.ALERT_FROM_EMAIL ?? 'alerts@rightaichoice.com'
const OWNER_FALLBACK = 'tanmayverma321@gmail.com'
const ADMIN_URL = 'https://rightaichoice.com/admin/ai-citations'

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

export type GeoEmailResult = { ok: boolean; skipped?: boolean; error?: string }

export async function sendGeoReportEmail(): Promise<GeoEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ALERT_EMAIL ?? process.env.ALERT_EMAIL_TO ?? process.env.ADMIN_EMAIL ?? OWNER_FALLBACK
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }

  const p = await loadGeoCitationPanel()
  if (!p.hasData) return { ok: true, skipped: true }

  const tone = p.cited > 0 ? '#059669' : '#b45309'
  const trendStr = p.trend.length
    ? p.trend.map((t) => `${t.rate}%`).slice(0, 6).reverse().join(' → ')
    : '—'
  const competitorStrip = p.topCompetitors.length
    ? p.topCompetitors.map((c) => `${esc(c.domain)} ×${c.n}`).join(' · ')
    : 'none cited this run'

  const promptRows = p.rows
    .map((r) => {
      const mark = r.error ? 'err' : r.cited ? '✅ cited' : r.retrieved ? '· seen' : '✗ absent'
      const comp = r.competitors.map((c) => esc(c.domain)).join(', ') || '—'
      return `<tr>
        <td style="padding:5px 8px;border-bottom:1px solid #eee">${esc(r.prompt_id)}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee">${mark}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right">${r.citation_rank ?? '—'}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right">${r.share_of_voice != null ? Math.round(r.share_of_voice * 100) + '%' : '—'}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #eee;color:#6b7280">${comp}</td>
      </tr>`
    })
    .join('')

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#1f2937;max-width:680px">
    <h2 style="color:${tone};margin:0 0 4px;font-size:17px">🔎 GEO citation report — ${esc(p.snapshotDate ?? '')}</h2>
    <p style="margin:0 0 12px;color:#6b7280">Engine: ${esc(p.engine ?? '')} · do AI assistants cite rightaichoice.com for our target questions?</p>
    <div style="font-size:22px;font-weight:700;color:${tone};margin:0 0 4px">${p.cited} / ${p.total} prompts cited us (${p.rate}%)</div>
    <p style="margin:0 0 16px"><strong>Weekly trend:</strong> ${trendStr}<br/><strong>Competitors cited:</strong> ${competitorStrip}</p>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead><tr style="text-align:left;color:#6b7280">
        <th style="padding:5px 8px">Question</th><th style="padding:5px 8px">Cited?</th>
        <th style="padding:5px 8px;text-align:right">Rank</th><th style="padding:5px 8px;text-align:right">Share</th>
        <th style="padding:5px 8px">Competitors</th>
      </tr></thead>
      <tbody>${promptRows}</tbody>
    </table>
    <p style="margin:16px 0 0"><a href="${ADMIN_URL}" style="color:#059669;text-decoration:none">→ Open the AI Citations dashboard</a></p>
    <p style="margin:8px 0 0;color:#9ca3af;font-size:12px">${p.cited === 0 ? 'Still at zero — expected early on. Citations climb as directory listings, reviews, and PR build our reputation.' : 'Movement! Keep feeding the authority + PR engines.'}</p>
  </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: `🔎 GEO report: ${p.cited}/${p.total} AI citations (${p.rate}%) — ${p.snapshotDate}`,
      html,
    }),
  })
  if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` }
  return { ok: true }
}
