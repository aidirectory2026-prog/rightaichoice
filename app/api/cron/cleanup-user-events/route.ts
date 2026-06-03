// Phase 8.h (2026-05-20) — daily cleanup of user_events older than 90 days.
//
// user_intent_profile is NOT cleaned — it's the running per-user record;
// arrays are capped per row inside the upsert_user_intent function.

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60

const RETENTION_DAYS = 90

export const POST = cronRoute({ pipelineKey: 'cleanup-user-events' }, async (ctx) => {
  const db = getAdminClient()
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { count, error } = await db
    .from('user_events')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  if (error) throw new Error(`cleanup_user_events: ${error.message}`)

  const deleted = count ?? 0
  ctx.recordItems({ processed: deleted, succeeded: deleted, failed: 0 })
  ctx.recordMetadata({ retention_days: RETENTION_DAYS, cutoff })
  return { ok: true, deleted, retention_days: RETENTION_DAYS, cutoff }
})

// Vercel Cron invokes via GET. The Phase 8.d.3 refactor made this route
// POST-only, so the scheduled Vercel GET silently 405ed and the job never ran
// (0 runs). Alias GET → the same handler (as submit-urls-bing/snapshot-gsc do);
// POST stays for GitHub-Actions / manual curl triggers.
export const GET = POST
