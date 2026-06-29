// Phase 13 Social — Instagram publisher (free; Business/Creator + Meta App Review).
//
// Two-step Graph API flow: create a media container (needs a PUBLIC image_url —
// that's why our graphic route is public) → publish the container. caption carries
// copy + hashtags; IG has no inline links (link-in-bio).

import type { SocialAccount, SocialPost } from '../types'
import type { MetricsResult, Publisher, PublishOpts, PublishResult } from './types'
import { fail, isRetryableStatus, postJson, tokenUsable } from './util'

const GRAPH = 'https://graph.facebook.com/v21.0'

function igUserId(account: SocialAccount): string | null {
  return account.external_account_id ?? process.env.INSTAGRAM_USER_ID ?? null
}

/** Pure: the media-container params (caption = copy + hashtags). */
export function buildIgContainer(post: SocialPost, graphicUrl: string): { image_url: string; caption: string } {
  const tags = post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''
  return { image_url: graphicUrl, caption: `${post.copy}${tags}` }
}

export const instagramPublisher: Publisher = {
  platform: 'instagram',

  isEnabled(account: SocialAccount | null): boolean {
    if (process.env.INSTAGRAM_ENABLED !== '1') return false
    return (
      !!account &&
      account.status === 'connected' &&
      tokenUsable(account.access_token, account.token_expires_at) &&
      !!igUserId(account)
    )
  },

  async publish(post: SocialPost, account: SocialAccount, opts: PublishOpts): Promise<PublishResult> {
    const uid = igUserId(account)
    if (!uid) return fail('instagram: no IG user id configured', false)
    if (!opts.graphicUrl) return fail('instagram: a public graphic URL is required', false)

    // 0) pre-check the graphic URL is publicly reachable. Instagram fetches it
    // server-side; if SOCIAL_PUBLIC_ORIGIN is misconfigured (localhost / behind
    // auth) the container call fails with an opaque error. Fail fast + clearly.
    try {
      const head = await fetch(opts.graphicUrl, { method: 'GET', headers: { Range: 'bytes=0-0' } })
      if (!head.ok) {
        return fail(`instagram: graphic URL not publicly reachable (HTTP ${head.status}) — check SOCIAL_PUBLIC_ORIGIN`, false)
      }
    } catch (e) {
      return fail(`instagram: graphic URL fetch failed (${e instanceof Error ? e.message : 'network'}) — check SOCIAL_PUBLIC_ORIGIN`, true)
    }

    // 1) container
    const c = await postJson(`${GRAPH}/${uid}/media`, buildIgContainer(post, opts.graphicUrl), {
      Authorization: `Bearer ${account.access_token}`,
    })
    if (!(c.status === 200 && c.json?.id)) {
      return fail(`instagram container ${c.status}: ${c.text.slice(0, 200)}`, isRetryableStatus(c.status))
    }
    // 2) publish
    const p = await postJson(
      `${GRAPH}/${uid}/media_publish`,
      { creation_id: c.json.id },
      { Authorization: `Bearer ${account.access_token}` },
    )
    if (!(p.status === 200 && p.json?.id)) {
      return fail(`instagram publish ${p.status}: ${p.text.slice(0, 200)}`, isRetryableStatus(p.status))
    }
    const mediaId = p.json.id as string
    // best-effort permalink
    let permalink = ''
    try {
      const link = await fetch(`${GRAPH}/${mediaId}?fields=permalink&access_token=${account.access_token}`)
      if (link.ok) permalink = ((await link.json()) as { permalink?: string }).permalink ?? ''
    } catch {
      /* */
    }
    return { ok: true, externalId: mediaId, externalUrl: permalink, costUsd: 0 }
  },

  async fetchMetrics(post: SocialPost, account: SocialAccount): Promise<MetricsResult> {
    if (!post.external_post_id) return null
    const url = `${GRAPH}/${post.external_post_id}/insights?metric=reach,likes,comments,shares&access_token=${account.access_token}`
    const res = await fetch(url)
    if (!res.ok) return null
    const j = (await res.json()) as { data?: Array<{ name: string; values?: Array<{ value: number }> }> }
    const get = (n: string) => j.data?.find((d) => d.name === n)?.values?.[0]?.value
    return {
      impressions: get('reach'),
      likes: get('likes'),
      comments: get('comments'),
      shares: get('shares'),
      raw: (j as unknown as Record<string, unknown>) ?? {},
    }
  },
}
