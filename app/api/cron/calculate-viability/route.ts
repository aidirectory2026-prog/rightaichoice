import { cronRoute } from '@/lib/pipelines/with-logging'
import { calculateViabilityBatch } from '@/lib/cron/viability'

export const maxDuration = 120

export const POST = cronRoute({ pipelineKey: 'calculate-viability' }, async (ctx) => {
  // Phase 9 (Automations & Catalog) A3 — 50 → 300/night so the nightly cron
  // actually clears the backlog: ~1,974 tools / 300 ≈ 6.6-day cycle (<7d).
  // calculateSignals() is pure CPU over existing DB columns (no per-tool
  // network calls), so 300 fits comfortably in maxDuration.
  const { processed, errors } = await calculateViabilityBatch(300)
  ctx.recordItems({ processed, succeeded: processed - errors.length, failed: errors.length })
  if (errors.length > 0) ctx.recordMetadata({ errors: errors.slice(0, 10) })
  return { ok: true, processed, errors: errors.length > 0 ? errors : undefined }
})
