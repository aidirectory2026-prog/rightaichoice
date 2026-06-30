// Phase 13 Social — weekly strategy cron. Each Monday (before the daily draft),
// crafts this week's strategy per platform from last week's posts + engagement,
// aligned to the brand goals. The brain reads these when drafting, and the admin
// shows them per platform. Scheduled Mon 04:00 UTC (social-draft runs 05:00).

import { cronRoute } from '@/lib/pipelines/with-logging'
import { buildAllStrategies } from '@/lib/social/strategy'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export const GET = cronRoute({ pipelineKey: 'social-strategy' }, async (ctx) => {
  const strategies = await buildAllStrategies()
  ctx.recordItems({ processed: strategies.length, succeeded: strategies.length })
  ctx.recordMetadata({ platforms: strategies.map((s) => s.platform), week: strategies[0]?.weekStart })
  return { generated: strategies.length, week: strategies[0]?.weekStart }
})
