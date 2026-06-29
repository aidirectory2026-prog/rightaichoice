// Phase 13 Social — daily drafting cron. Fills the queue with fresh drafts from
// live data so the founder always has something to approve. Drafts only; nothing
// posts. X budget inputs gate X drafts at draft time.

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { draftPosts, recycleTopPerformers } from '@/lib/social/brain'
import { xPostCost } from '@/lib/social/sops'
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
  // Spend so far this month = already-POSTED X cost...
  const spendRes = await db
    .from('social_posts')
    .select('cost_usd')
    .eq('platform', 'x')
    .eq('status', 'posted')
    .gte('posted_at', startOfMonthISO())
  const postedSpend = ((spendRes.data ?? []) as { cost_usd: number }[]).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)
  // ...PLUS the projected cost of already-approved/scheduled X posts that haven't
  // posted yet (they WILL post this month), so drafting can't silently overcommit
  // the cap behind a pile of pending approvals.
  const pendingRes = await db
    .from('social_posts')
    .select('link_url')
    .eq('platform', 'x')
    .in('status', ['approved', 'scheduled'])
  const pendingSpend = ((pendingRes.data ?? []) as { link_url: string | null }[]).reduce(
    (s, r) => s + xPostCost(!!r.link_url),
    0,
  )
  const xSpend = postedSpend + pendingSpend

  const perPlatform = process.env.SOCIAL_DRAFTS_PER_PLATFORM ? parseInt(process.env.SOCIAL_DRAFTS_PER_PLATFORM, 10) : 1
  const { poolSize, outcomes } = await draftPosts({
    platforms: PLATFORMS,
    perPlatform,
    xMonthlyCapUSD: xCap,
    xMonthSpendUSD: xSpend,
    abVariants: process.env.SOCIAL_AB_VARIANTS === '1',
  })

  // Optional evergreen recycling: re-queue a top performer as a fresh (rephrased) draft.
  let recycled = 0
  if (process.env.SOCIAL_RECYCLE === '1') {
    const rec = await recycleTopPerformers({ olderThanDays: 30, max: 1 })
    recycled = rec.filter((o) => o.status === 'queued').length
    outcomes.push(...rec)
  }

  const queued = outcomes.filter((o) => o.status === 'queued').length
  const failed = outcomes.filter((o) => o.status === 'error' || o.status === 'rejected').length

  ctx.recordItems({ processed: outcomes.length, succeeded: queued, failed })
  ctx.recordMetadata({ poolSize, queued, recycled, perPlatform, xSpend: +xSpend.toFixed(3), postedSpend: +postedSpend.toFixed(3), pendingSpend: +pendingSpend.toFixed(3) })
  if (queued < outcomes.length) ctx.setStatus('partial')
  return { poolSize, queued, recycled, total: outcomes.length }
})
