import { cronRoute } from '@/lib/pipelines/with-logging'
import { calculateViabilityBatch } from '@/lib/cron/viability'

export const maxDuration = 60

export const POST = cronRoute({ pipelineKey: 'calculate-viability' }, async (ctx) => {
  const { processed, errors } = await calculateViabilityBatch(50)
  ctx.recordItems({ processed, succeeded: processed - errors.length, failed: errors.length })
  if (errors.length > 0) ctx.recordMetadata({ errors: errors.slice(0, 10) })
  return { ok: true, processed, errors: errors.length > 0 ? errors : undefined }
})
