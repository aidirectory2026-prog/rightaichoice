import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { runFaqRefresh } from '@/lib/cron/faq-generator'

export const maxDuration = 300

export const POST = cronRoute({ pipelineKey: 'refresh-faqs' }, async (ctx) => {
  const supabase = getAdminClient()
  const result = await runFaqRefresh(supabase)
  ctx.recordMetadata({ result })
  return result
})
