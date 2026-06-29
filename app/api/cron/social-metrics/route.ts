// Phase 13 Social — engagement collection cron (6-hourly). For recently posted
// items, pulls each platform's metrics and appends a social_metrics row (time
// series). Feeds the insights loop (S7). Best-effort: skips platforms that aren't
// connected or don't expose metrics.

import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { getPublisher, loadAccount } from '@/lib/social/publishers'
import type { Platform, SocialAccount, SocialPost } from '@/lib/social/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export const GET = cronRoute({ pipelineKey: 'social-metrics' }, async (ctx) => {
  const db = getAdminClient()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const res = await db
    .from('social_posts')
    .select('id, platform, external_post_id, posted_at')
    .eq('status', 'posted')
    .not('external_post_id', 'is', null)
    .gte('posted_at', since)
    .limit(100)
  const posts = (res.data ?? []) as SocialPost[]

  // Cache one account per platform.
  const accounts = new Map<Platform, SocialAccount | null>()
  let captured = 0

  for (const post of posts) {
    if (!accounts.has(post.platform)) accounts.set(post.platform, await loadAccount(post.platform))
    const account = accounts.get(post.platform) ?? null
    const publisher = getPublisher(post.platform)
    if (!publisher.isEnabled(account)) continue
    const m = await publisher.fetchMetrics(post, account as SocialAccount)
    if (!m) continue
    await db.from('social_metrics').insert({
      post_id: post.id,
      impressions: m.impressions ?? null,
      likes: m.likes ?? null,
      comments: m.comments ?? null,
      shares: m.shares ?? null,
      clicks: m.clicks ?? null,
      raw: m.raw,
    } as never)
    captured++
  }

  ctx.recordItems({ processed: posts.length, succeeded: captured })
  ctx.recordMetadata({ captured, considered: posts.length })
  return { considered: posts.length, captured }
})
