// Phase 13 Social — the publisher cron (the "posts even when the laptop is off"
// layer). Every 15 min: finds APPROVED posts whose scheduled time has arrived,
// re-checks the SOPs at the moment of posting (X budget, daily cap/spacing, full
// Reddit safety), atomically CLAIMS each row so overlapping runs can't double-post,
// then posts via the platform publisher and records the outcome. Platforms that
// aren't connected yet are SKIPPED (left approved), never marked failed — so
// approving ahead of setup is safe.

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { getPublisher, loadAccount, publicGraphicUrl } from '@/lib/social/publishers'
import { REDDIT_ALLOWLIST, REDDIT_DEFAULTS, canPublishNow, redditSafety, withinXBudget } from '@/lib/social/sops'
import type { SocialAccount, SocialPost } from '@/lib/social/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// A claim older than this is treated as stale (a run that crashed mid-publish) and
// may be reclaimed — so a dead run can't strand an approved post forever.
const CLAIM_STALE_MS = 10 * 60 * 1000

function startOfMonthISO(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}
// PostgREST .or() uses '.' as a separator, so fractional seconds break the filter.
const noMs = (iso: string) => iso.replace(/\.\d{3}Z$/, 'Z')

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

  // Full Reddit safety at post time (account state + our own posting history can
  // change between approval and publish). Uses stored age/karma from meta when present.
  async function redditChecks(post: SocialPost, account: SocialAccount | null) {
    const sub = (post.subreddit ?? '').replace(/^r\//, '')
    const linkRes = post.link_url
      ? await db.from('social_posts').select('subreddit').eq('platform', 'reddit').eq('status', 'posted').eq('link_url', post.link_url).neq('id', post.id)
      : { data: [] as { subreddit: string | null }[] }
    const subsLinkAlreadyPosted = ((linkRes.data ?? []) as { subreddit: string | null }[])
      .map((r) => r.subreddit)
      .filter(Boolean) as string[]
    const since7 = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const weekRes = await db
      .from('social_posts')
      .select('id')
      .eq('platform', 'reddit')
      .eq('status', 'posted')
      .eq('subreddit', post.subreddit ?? '')
      .gte('posted_at', since7)
    const meta = (account?.meta ?? {}) as { accountAgeDays?: number; accountKarma?: number }
    return redditSafety({
      subreddit: sub,
      allowlist: REDDIT_ALLOWLIST,
      accountAgeDays: Number(meta.accountAgeDays ?? REDDIT_DEFAULTS.minAccountAgeDays),
      accountKarma: Number(meta.accountKarma ?? REDDIT_DEFAULTS.minKarma),
      subsLinkAlreadyPosted,
      postsToSubLast7Days: ((weekRes.data ?? []) as unknown[]).length,
    })
  }

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
      await setRow({ error: `${post.platform} not connected/paused — left approved` })
      continue
    }

    // 2) last-mile SOP re-checks (cheap, read-only) before claiming.
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
      const r = await redditChecks(post, account)
      if (!r.ok) {
        skipped++
        await setRow({ error: `reddit: ${r.reasons.join('; ')}` })
        continue
      }
    }

    // 3) ATOMIC CLAIM — set publish_started_at iff still approved + unclaimed (or
    // the prior claim is stale). If no row comes back, another run already claimed
    // it → skip. This is what makes double-posting impossible across overlapping runs.
    const claimISO = new Date().toISOString()
    const staleISO = noMs(new Date(Date.now() - CLAIM_STALE_MS).toISOString())
    const claim = await db
      .from('social_posts')
      .update({ publish_started_at: claimISO, updated_at: claimISO } as never)
      .eq('id', post.id)
      .eq('status', 'approved')
      .or(`publish_started_at.is.null,publish_started_at.lt.${staleISO}`)
      .select('id')
    if (!((claim.data ?? []) as unknown[]).length) {
      skipped++ // claimed by a concurrent run
      continue
    }

    // 4) publish.
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
      // transient — release the claim so the next run retries promptly (don't wait out the stale window).
      skipped++
      await setRow({ error: `retryable: ${result.error}`, publish_started_at: null })
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
