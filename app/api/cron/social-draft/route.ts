// Phase 13 Social — daily drafting cron. Fills the queue with fresh drafts from
// live data so the founder always has something to approve. Drafts only; nothing
// posts. X budget inputs gate X drafts at draft time.

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { draftPosts } from '@/lib/social/brain'
import type { Platform } from '@/lib/social/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const PLATFORMS: Platform[] = ['linkedin', 'x', 'instagram', 'reddit']

function startOfMonthISO(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

export const GET = cronRoute({ pipelineKey: 'social-draft' }, async (ctx) => {
  const db = getAdminClient()
  const xCap = process.env.X_MONTHLY_CAP_USD ? parseFloat(process.env.X_MONTHLY_CAP_USD) : null
  const spendRes = await db
    .from('social_posts')
    .select('cost_usd')
    .eq('platform', 'x')
    .eq('status', 'posted')
    .gte('posted_at', startOfMonthISO())
  const xSpend = ((spendRes.data ?? []) as { cost_usd: number }[]).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)

  const perPlatform = process.env.SOCIAL_DRAFTS_PER_PLATFORM ? parseInt(process.env.SOCIAL_DRAFTS_PER_PLATFORM, 10) : 1
  const { poolSize, outcomes } = await draftPosts({
    platforms: PLATFORMS,
    perPlatform,
    xMonthlyCapUSD: xCap,
    xMonthSpendUSD: xSpend,
  })
  const queued = outcomes.filter((o) => o.status === 'queued').length
  const failed = outcomes.filter((o) => o.status === 'error' || o.status === 'rejected').length

  ctx.recordItems({ processed: outcomes.length, succeeded: queued, failed })
  ctx.recordMetadata({ poolSize, queued, perPlatform })
  if (queued < outcomes.length) ctx.setStatus('partial')
  return { poolSize, queued, total: outcomes.length }
})
