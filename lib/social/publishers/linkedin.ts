// Phase 13 Social — LinkedIn publisher (free; needs Community Management API
// approval, ~2–4wk). Posts to the COMPANY PAGE via /rest/posts. Text + link
// (LinkedIn auto-unfurls the link card); native image upload is a later
// enhancement (register-upload → asset URN flow).

import type { SocialAccount, SocialPost } from '../types'
import type { MetricsResult, Publisher, PublishResult } from './types'
import { fail, isRetryableStatus, postJson, tokenUsable } from './util'

const POSTS_URL = 'https://api.linkedin.com/rest/posts'
const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION ?? '202506'

function orgUrn(account: SocialAccount): string | null {
  return account.external_account_id ?? process.env.LINKEDIN_ORG_URN ?? null
}

/** Pure: the /rest/posts body. `commentary` carries copy; hashtags appended inline. */
export function buildLinkedInPost(post: SocialPost, authorUrn: string) {
  const tags = post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''
  return {
    author: authorUrn,
    commentary: `${post.copy}${tags}`,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }
}

export const linkedinPublisher: Publisher = {
  platform: 'linkedin',

  isEnabled(account: SocialAccount | null): boolean {
    if (process.env.LINKEDIN_ENABLED !== '1') return false
    return (
      !!account &&
      account.status === 'connected' &&
      tokenUsable(account.access_token, account.token_expires_at) &&
      !!orgUrn(account)
    )
  },

  async publish(post: SocialPost, account: SocialAccount): Promise<PublishResult> {
    const urn = orgUrn(account)
    if (!urn) return fail('linkedin: no organization URN configured', false)
    const { status, json, text, headers } = await postJson(POSTS_URL, buildLinkedInPost(post, urn), {
      Authorization: `Bearer ${account.access_token}`,
      'LinkedIn-Version': LINKEDIN_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
    })
    // LinkedIn returns the post URN in the x-restli-id response header (preferred)
    // or the body id. Require a REAL id — never report success without one (a 200
    // with no id means the post did not actually create).
    const id = (headers['x-restli-id'] as string | undefined) ?? (json?.id as string | undefined)
    if ((status === 200 || status === 201) && id) {
      return {
        ok: true,
        externalId: id,
        externalUrl: `https://www.linkedin.com/feed/update/${id}`,
        costUsd: 0,
      }
    }
    if (status === 200 || status === 201) {
      // Accepted but no id surfaced — treat as retryable so we re-verify rather than
      // silently mark a possibly-uncreated post as done.
      return fail(`linkedin ${status}: success status but no post id returned`, true)
    }
    return fail(`linkedin ${status}: ${text.slice(0, 200)}`, isRetryableStatus(status))
  },

  // Org share statistics need a separate API + lookback window; deferred to S7.
  async fetchMetrics(): Promise<MetricsResult> {
    return null
  },
}
