import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runCompareEditorialCascade } from '@/lib/cron/cascade-editorials'

export const maxDuration = 300

// Phase 8 cascade (2026-05-16):
// Daily 08:00 UTC. Picks top N most-stale editorial comparisons from
// v_stale_comparisons view (any compare where ANY tool was refreshed
// more recently than the compare's last_reviewed_at), regenerates the
// editorial fields (tldr/verdict/feature_analysis/pricing_analysis/
// use_cases/faqs) via DeepSeek, bumps last_reviewed_at.
//
// Compare-page-level facts (live pricing, integrations, ratings) are
// already rendered live from tools.* — this only refreshes the OPINION
// layer that was generated as text and goes stale when underlying tools
// change.

const handler = cronRoute({ pipelineKey: 'refresh-compare-editorials' }, async (ctx, request) => {
  const url = new URL(request.url)
  const batchParam = Number(url.searchParams.get('batch'))
  // Migration 133 fan-out can flag every referencing compare on one tool
  // change, so the queue is larger; allow a higher override ceiling. The
  // Vercel-route default stays conservative (60) for the 300s function budget —
  // the GH Actions batch script (lib default 120) does the bulk draining.
  const batchSize =
    Number.isFinite(batchParam) && batchParam > 0 && batchParam <= 200 ? batchParam : 60

  const supabase = getAdminClient()
  const result = await runCompareEditorialCascade(supabase, batchSize)

  // result shape from runCompareEditorialCascade typically includes
  // { processed, regenerated, failed, slugs } — defensive optional read.
  type CascadeResult = {
    processed?: number
    regenerated?: number
    succeeded?: number
    failed?: number
    slugs?: string[]
  }
  const r = result as CascadeResult
  ctx.recordItems({
    processed: r.processed ?? r.regenerated ?? batchSize,
    succeeded: r.succeeded ?? r.regenerated,
    failed: r.failed,
  })
  ctx.recordMetadata({ batchSize, slugs: r.slugs?.slice(0, 20) })

  return { ...result, batchSize }
})

export const POST = handler
export const GET = handler
