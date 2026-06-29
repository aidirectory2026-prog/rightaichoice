// Phase 13 Social — Reddit publisher (free, HIGH ban-risk → always manual-approve).
//
// redditSafety() (sops.ts) gates the draft; this just submits an already-approved
// post via the user-context OAuth token. Self-post by default; link post if a
// link_url is set. Reddit wants a real User-Agent + form-encoded body.

import type { SocialAccount, SocialPost } from '../types'
import type { MetricsResult, Publisher, PublishResult } from './types'
import { fail, isRetryableStatus, tokenUsable } from './util'

const SUBMIT_URL = 'https://oauth.reddit.com/api/submit'
const UA = process.env.REDDIT_USER_AGENT ?? 'web:rightaichoice:v1 (by /u/rightaichoice)'

export type RedditSubmit = { sr: string; kind: 'self' | 'link'; title: string; text?: string; url?: string; api_type: 'json' }

/** Pure: the /api/submit params. Title from the brain's suggested title (or copy's first line). */
export function buildRedditSubmit(post: SocialPost): RedditSubmit {
  const sub = (post.subreddit ?? '').replace(/^r\//, '')
  const title =
    (post.brain_meta?.title as string | undefined)?.trim() ||
    post.copy.split('\n')[0].slice(0, 300)
  return post.link_url
    ? { sr: sub, kind: 'link', title, url: post.link_url, api_type: 'json' }
    : { sr: sub, kind: 'self', title, text: post.copy, api_type: 'json' }
}

export const redditPublisher: Publisher = {
  platform: 'reddit',

  isEnabled(account: SocialAccount | null): boolean {
    if (process.env.REDDIT_ENABLED !== '1') return false
    return (
      !!account &&
      account.status === 'connected' &&
      tokenUsable(account.access_token, account.token_expires_at) &&
      !!process.env.REDDIT_CLIENT_ID
    )
  },

  async publish(post: SocialPost, account: SocialAccount): Promise<PublishResult> {
    const params = buildRedditSubmit(post)
    if (!params.sr) return fail('reddit: no subreddit on the post', false)
    const form = new URLSearchParams(params as unknown as Record<string, string>)
    const res = await fetch(SUBMIT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
      },
      body: form.toString(),
    })
    const text = await res.text()
    let j: any = null
    try {
      j = JSON.parse(text)
    } catch {
      /* */
    }
    const errs = j?.json?.errors
    if (res.ok && Array.isArray(errs) && errs.length === 0 && j?.json?.data) {
      return {
        ok: true,
        externalId: (j.json.data.name as string) ?? (j.json.data.id as string),
        externalUrl: (j.json.data.url as string) ?? '',
        costUsd: 0,
      }
    }
    const msg = Array.isArray(errs) && errs.length ? JSON.stringify(errs) : text.slice(0, 200)
    return fail(`reddit ${res.status}: ${msg}`, isRetryableStatus(res.status))
  },

  async fetchMetrics(post: SocialPost, account: SocialAccount): Promise<MetricsResult> {
    if (!post.external_post_id) return null
    const res = await fetch(`https://oauth.reddit.com/api/info?id=${post.external_post_id}`, {
      headers: { Authorization: `Bearer ${account.access_token}`, 'User-Agent': UA },
    })
    if (!res.ok) return null
    const j = (await res.json()) as { data?: { children?: Array<{ data?: Record<string, number> }> } }
    const d = j.data?.children?.[0]?.data ?? {}
    return { likes: d.ups, comments: d.num_comments, raw: d }
  },
}
