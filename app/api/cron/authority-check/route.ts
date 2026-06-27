/**
 * Phase 13 D2.4 — weekly backlink monitoring.
 *
 * Re-fetches each submitted/live directory listing and detects whether it links
 * back to rightaichoice.com; confirmed backlinks are logged into referring_domains
 * (feeding the existing /admin/authority dashboard). Mirrors the authority:check CLI.
 * Scheduled Mondays 07:30 UTC.
 */
import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { detectBacklink } from '@/lib/authority/backlink-check'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export const GET = cronRoute({ pipelineKey: 'authority-check' }, async (ctx) => {
  const db = getAdminClient()
  const { data } = await db
    .from('directory_submissions')
    .select('id, directory_key, live_url')
    .in('status', ['submitted', 'live'])
    .not('live_url', 'is', null)
  const rows = (data ?? []) as Array<{ id: string; directory_key: string; live_url: string }>

  let backlinks = 0
  for (const r of rows) {
    const res = await detectBacklink(r.live_url)
    const now = new Date().toISOString()
    await db
      .from('directory_submissions')
      .update({ last_checked_at: now, backlink_detected: res.found, status: res.found ? 'live' : 'submitted', updated_at: now } as never)
      .eq('id', r.id)
    if (res.found) {
      backlinks++
      const host = r.live_url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      await db.from('referring_domains').upsert(
        { domain: host, source_channel: 'other', target_url: 'https://rightaichoice.com', source_url: r.live_url, notes: `directory:${r.directory_key}` } as never,
        { onConflict: 'domain', ignoreDuplicates: true },
      )
    }
  }
  ctx.recordItems({ processed: rows.length, succeeded: backlinks })
  ctx.recordMetadata({ backlinks })
  return { checked: rows.length, backlinks }
})
