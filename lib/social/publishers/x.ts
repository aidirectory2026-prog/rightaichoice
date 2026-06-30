// Phase 13 Social — X / Twitter publisher (paid, budget-capped).
//
// X has no free tier (2026): pay-per-use, ~$0.015/post, ~$0.20/post-with-link.
// Posts text + (R2) native branded image via chunked v1.1 media upload, and
// supports (R2) threads when the brain emits brain_meta.thread = string[].
// Cost is recorded at post time so the admin meter stays accurate.

import { X_COST_PER_POST, xPostCost } from '../sops'
import type { SocialAccount, SocialPost } from '../types'
import type { MetricsResult, Publisher, PublishOpts, PublishResult } from './types'
import { clamp, fail, isRetryableStatus, notPaused, postJson, tokenUsable } from './util'

const TWEETS_URL = 'https://api.twitter.com/2/tweets'
// v2 media upload — works with the OAuth2 user token (the legacy v1.1 upload host
// rejects OAuth2 with a 403). Simple upload is fine for our small PNGs (<5MB).
const MEDIA_URL = 'https://api.twitter.com/2/media/upload'
const X_MAX = 280

/** Pure: the v2 tweet body. Attach media on the first tweet; reply for thread chaining. */
export type TweetPayload = { text: string; media?: { media_ids: string[] }; reply?: { in_reply_to_tweet_id: string } }
export function buildTweetPayload(text: string, opts: { mediaIds?: string[]; replyToId?: string } = {}): TweetPayload {
  const body: TweetPayload = { text: clamp(text, X_MAX) }
  if (opts.mediaIds?.length) body.media = { media_ids: opts.mediaIds }
  if (opts.replyToId) body.reply = { in_reply_to_tweet_id: opts.replyToId }
  return body
}

/** Pure: a post's thread parts (brain_meta.thread) or a single-tweet array. */
export function threadParts(post: SocialPost): string[] {
  const t = (post.brain_meta as { thread?: unknown } | null)?.thread
  if (Array.isArray(t) && t.length && t.every((s) => typeof s === 'string' && (s as string).trim())) {
    return t as string[]
  }
  return [post.copy]
}

/** Chunked v1.1 media upload (INIT → APPEND → FINALIZE) → media_id_string. */
async function uploadMedia(token: string, graphicUrl: string): Promise<{ ok: true; mediaId: string } | { ok: false; error: string; retryable: boolean }> {
  const img = await fetch(graphicUrl)
  if (!img.ok) return { ok: false, error: `media fetch ${img.status}`, retryable: true }
  const bytes = Buffer.from(await img.arrayBuffer())

  // v2 simple upload: one multipart POST with the bytes + media_category.
  const fd = new FormData()
  fd.set('media', new Blob([bytes], { type: 'image/png' }), 'graphic.png')
  fd.set('media_category', 'tweet_image')
  const r = await fetch(MEDIA_URL, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  if (!r.ok) return { ok: false, error: `media v2 ${r.status}: ${(await r.text()).slice(0, 150)}`, retryable: isRetryableStatus(r.status) }
  const j = (await r.json()) as { data?: { id?: string }; id?: string; media_id_string?: string }
  const mediaId = j?.data?.id ?? j?.media_id_string ?? j?.id
  if (!mediaId) return { ok: false, error: 'media v2: no id in response', retryable: true }
  return { ok: true, mediaId: String(mediaId) }
}

export const xPublisher: Publisher = {
  platform: 'x',

  isEnabled(account: SocialAccount | null): boolean {
    if (process.env.X_ENABLED !== '1') return false
    return (
      !!account &&
      account.status === 'connected' &&
      notPaused(account) &&
      tokenUsable(account.access_token, account.token_expires_at)
    )
  },

  async publish(post: SocialPost, account: SocialAccount, opts: PublishOpts): Promise<PublishResult> {
    const token = account.access_token!
    // Upload the branded graphic (attached to the first tweet) if the post has one.
    let mediaIds: string[] | undefined
    if (post.graphic_template && opts.graphicUrl) {
      const up = await uploadMedia(token, opts.graphicUrl)
      if (!up.ok) return fail(`X media: ${up.error}`, up.retryable)
      mediaIds = [up.mediaId]
    }

    const parts = threadParts(post)
    let firstId = ''
    let replyTo: string | undefined
    let costUsd = 0
    for (let i = 0; i < parts.length; i++) {
      const body = buildTweetPayload(parts[i], { mediaIds: i === 0 ? mediaIds : undefined, replyToId: replyTo })
      const { status, json, text } = await postJson(TWEETS_URL, body, { Authorization: `Bearer ${token}` })
      if (!(status === 201 && json?.data?.id)) {
        // First tweet failing = whole post failed. A later reply failing = thread is
        // partially posted; stop and report success of the head (a retry must NOT
        // re-post the head — the row is already claimed/marked posted by the cron).
        if (i === 0) return fail(`X ${status}: ${text.slice(0, 200)}`, isRetryableStatus(status))
        break
      }
      const id = json.data.id as string
      if (i === 0) firstId = id
      replyTo = id
      costUsd += i === 0 ? xPostCost(!!post.link_url) : X_COST_PER_POST
    }
    return { ok: true, externalId: firstId, externalUrl: `https://twitter.com/i/web/status/${firstId}`, costUsd }
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
