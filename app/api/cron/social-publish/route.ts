// Phase 13 Social — the publisher cron (the "posts even when the laptop is off"
// layer). Every 15 min: finds APPROVED posts whose scheduled time has arrived,
// re-checks the SOPs at the moment of posting (X budget, daily cap/spacing,
// Reddit allowlist), then posts via the platform publisher and records the
// outcome. Platforms that aren't connected yet are SKIPPED (left approved), never
// marked failed — so approving ahead of setup is safe.

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { getPublisher, loadAccount, publicGraphicUrl } from '@/lib/social/publishers'
import { REDDIT_ALLOWLIST, canPublishNow, withinXBudget } from '@/lib/social/sops'
import type { SocialPost } from '@/lib/social/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function startOfMonthISO(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

export const GET = cronRoute({ pipelineKey: 'social-publish' }, async (ctx) => {
  const db = getAdminClient()
  const now = new Date()
  const nowISO = now.toISOString()

  const dueRes = await db
    .from('social_posts')
    .select('*')
    .eq('status', 'approved')
    .lte('scheduled_at', nowISO)
    .order('scheduled_at', { ascending: true })
    .limit(10)
  const due = (dueRes.data ?? []) as SocialPost[]

  // X month-to-date spend (for the budget governor at post time).
  const xCap = process.env.X_MONTHLY_CAP_USD ? parseFloat(process.env.X_MONTHLY_CAP_USD) : null
  const spendRes = await db
    .from('social_posts')
    .select('cost_usd')
    .eq('platform', 'x')
    .eq('status', 'posted')
    .gte('posted_at', startOfMonthISO())
  let xSpend = ((spendRes.data ?? []) as { cost_usd: number }[]).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0)

  // Per-platform counts today + last post time (no-burst / daily-cap re-check).
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
  const postedTodayRes = await db.from('social_posts').select('platform, posted_at').eq('status', 'posted').gte('posted_at', todayStart)
  const postedToday = (postedTodayRes.data ?? []) as { platform: string; posted_at: string }[]
  const countToday = (pl: string) => postedToday.filter((r) => r.platform === pl).length
  const lastPost = (pl: string) =>
    postedToday.filter((r) => r.platform === pl).map((r) => r.posted_at).sort().slice(-1)[0] ?? null

  let posted = 0
  let failed = 0
  let skipped = 0

  for (const post of due) {
    const setRow = async (patch: Record<string, unknown>) =>
      db.from('social_posts').update({ ...patch, updated_at: new Date().toISOString() } as never).eq('id', post.id)

    // 1) platform connected/enabled? if not, skip (leave approved).
    const account = await loadAccount(post.platform)
    const publisher = getPublisher(post.platform)
    if (!publisher.isEnabled(account)) {
      skipped++
      await setRow({ error: `${post.platform} not connected yet — left approved` })
      continue
    }

    // 2) last-mile SOP re-checks.
    const sched = canPublishNow({
      platform: post.platform,
      whenUTCISO: nowISO,
      postsTodayOnPlatform: countToday(post.platform),
      lastPostUTCISO: lastPost(post.platform),
    })
    if (!sched.ok) {
      skipped++
      await setRow({ error: `deferred: ${sched.reasons.join('; ')}` })
      continue
    }
    if (post.platform === 'x' && xCap != null) {
      const v = withinXBudget({ monthSpendUSD: xSpend, monthlyCapUSD: xCap, hasLink: !!post.link_url })
      if (!v.ok) {
        skipped++
        await setRow({ error: `X budget: ${v.reasons.join('; ')}` })
        continue
      }
    }
    if (post.platform === 'reddit') {
      const sub = (post.subreddit ?? '').replace(/^r\//, '').toLowerCase()
      if (!REDDIT_ALLOWLIST.map((s) => s.toLowerCase()).includes(sub)) {
        skipped++
        await setRow({ error: `reddit: r/${sub} not on allowlist` })
        continue
      }
    }

    // 3) publish.
    const opts = post.graphic_template ? { graphicUrl: publicGraphicUrl(post.id) } : {}
    const result = await publisher.publish(post, account!, opts)
    if (result.ok) {
      posted++
      xSpend += result.costUsd
      await setRow({
        status: 'posted',
        posted_at: new Date().toISOString(),
        external_post_id: result.externalId,
        external_url: result.externalUrl,
        cost_usd: result.costUsd,
        error: null,
      })
    } else if (result.retryable) {
      skipped++ // transient — leave approved to retry next run
      await setRow({ error: `retryable: ${result.error}` })
    } else {
      failed++
      await setRow({ status: 'failed', error: result.error })
    }
  }

  ctx.recordItems({ processed: due.length, succeeded: posted, failed })
  ctx.recordMetadata({ posted, failed, skipped, due: due.length, xSpend: +xSpend.toFixed(3) })
  if (failed > 0 || skipped > 0) ctx.setStatus('partial')
  return { due: due.length, posted, failed, skipped }
})
