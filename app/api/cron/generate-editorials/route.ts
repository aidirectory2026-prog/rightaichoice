import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runEditorialGeneration } from '@/lib/cron/editorial'

export const maxDuration = 300

export const POST = cronRoute({ pipelineKey: 'generate-editorials' }, async (ctx) => {
  const supabase = getAdminClient()
  const result = await runEditorialGeneration(supabase)
  ctx.recordMetadata({ result })
  return result
})
