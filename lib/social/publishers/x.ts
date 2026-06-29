// Phase 13 Social — X / Twitter publisher (paid, budget-capped).
//
// X has no free tier (2026): pay-per-use, ~$0.015/post, ~$0.20/post-with-link.
// The brain already budget-gates at draft time; the cost is recorded here at post
// time so the admin meter stays accurate. Posts text (link inline); native media
// upload is a later enhancement (chunked v1.1 upload).

import { xPostCost } from '../sops'
import type { SocialAccount, SocialPost } from '../types'
import type { MetricsResult, Publisher, PublishOpts, PublishResult } from './types'
import { clamp, fail, isRetryableStatus, postJson, tokenUsable } from './util'

const TWEETS_URL = 'https://api.twitter.com/2/tweets'
const X_MAX = 280

/** Pure: the v2 tweet body. Copy already carries any link + hashtags (≤280). */
export function buildTweetPayload(post: SocialPost): { text: string } {
  return { text: clamp(post.copy, X_MAX) }
}

export const xPublisher: Publisher = {
  platform: 'x',

  isEnabled(account: SocialAccount | null): boolean {
    if (process.env.X_ENABLED !== '1') return false
    return !!account && account.status === 'connected' && tokenUsable(account.access_token, account.token_expires_at)
  },

  async publish(post: SocialPost, account: SocialAccount): Promise<PublishResult> {
    const body = buildTweetPayload(post)
    const { status, json, text } = await postJson(TWEETS_URL, body, {
      Authorization: `Bearer ${account.access_token}`,
    })
    if (status === 201 && json?.data?.id) {
      const id = json.data.id as string
      return {
        ok: true,
        externalId: id,
        externalUrl: `https://twitter.com/i/web/status/${id}`,
        costUsd: xPostCost(!!post.link_url),
      }
    }
    return fail(`X ${status}: ${text.slice(0, 200)}`, isRetryableStatus(status))
  },

  async fetchMetrics(post: SocialPost, account: SocialAccount): Promise<MetricsResult> {
    if (!post.external_post_id) return null
    const url = `${TWEETS_URL.replace('/tweets', '')}/tweets/${post.external_post_id}?tweet.fields=public_metrics`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${account.access_token}` } })
    if (!res.ok) return null
    const j = (await res.json()) as { data?: { public_metrics?: Record<string, number> } }
    const m = j.data?.public_metrics ?? {}
    return {
      impressions: m.impression_count,
      likes: m.like_count,
      comments: m.reply_count,
      shares: m.retweet_count,
      raw: m,
    }
  },
}
