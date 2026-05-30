import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'

// Phase 9 Smart SEO — seo-impact lift measurement (Mon 09:00 UTC).
//
// Closes the weekly loop: for every SEO change now >= 28 days old and not yet
// measured (Tier-1 title overrides + executed weekly_loop_actions), fills
// outcome_* from the latest 28d GSC snapshot via run_seo_impact(). Lift =
// outcome - baseline is computed at read time in /admin/seo-impact.
//
// Sequenced after snapshot-gsc (06:30) so it measures against fresh data.

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export const GET = cronRoute({ pipelineKey: 'seo-impact' }, async (ctx) => {
  const { data, error } = await getAdminClient().rpc('run_seo_impact')
  if (error) throw new Error(`run_seo_impact: ${error.message}`)

  const summary = (data ?? {}) as {
    snapshot_date?: string
    titles_measured?: number
    actions_measured?: number
    error?: string
  }
  if (summary.error) throw new Error(summary.error)

  const measured = (summary.titles_measured ?? 0) + (summary.actions_measured ?? 0)
  ctx.recordItems({ processed: measured, succeeded: measured })
  ctx.recordMetadata(summary)
  return { ok: true, ...summary }
})
