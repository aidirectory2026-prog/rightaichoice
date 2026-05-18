// Phase 8.d.8 (2026-05-18) — refresh the v_field_freshness materialized
// view nightly at 23:45 UTC (10 min before snapshot-daily-updates).
// Materialized so /admin/freshness loads in <100ms even at 5k+ tools;
// nightly is fine since field ages move slowly.

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const maxDuration = 60

export const POST = cronRoute({ pipelineKey: 'refresh-freshness-view' }, async (ctx) => {
  const supabase = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase as any).rpc('refresh_v_field_freshness')
  if (result.error) {
    // RPC not present yet — fall back to raw SQL via the SQL endpoint.
    // (Materialized view refresh isn't exposed through PostgREST directly
    // so we use a tiny SECURITY DEFINER function, applied below.)
    throw new Error(`refresh failed: ${result.error.message}`)
  }
  ctx.recordItems({ processed: 1, succeeded: 1 })
  return { ok: true, refreshed_at: new Date().toISOString() }
})
