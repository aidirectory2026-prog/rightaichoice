import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runTutorialDiscovery } from '@/lib/cron/tutorials'

export const maxDuration = 300

export const POST = cronRoute({ pipelineKey: 'discover-tutorials' }, async (ctx) => {
  const supabase = getAdminClient()
  const result = await runTutorialDiscovery(supabase)
  ctx.recordMetadata({ result })
  return result
})
