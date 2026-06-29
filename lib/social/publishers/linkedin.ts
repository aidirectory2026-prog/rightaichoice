// Phase 13 Social — LinkedIn publisher (free; needs Community Management API
// approval, ~2–4wk). Posts to the COMPANY PAGE via /rest/posts with the branded
// image attached (R2: Images API register-upload → asset URN → content.media).

import type { SocialAccount, SocialPost } from '../types'
import type { MetricsResult, Publisher, PublishOpts, PublishResult } from './types'
import { fail, isRetryableStatus, notPaused, postJson, tokenUsable } from './util'

const POSTS_URL = 'https://api.linkedin.com/rest/posts'
const IMAGES_INIT_URL = 'https://api.linkedin.com/rest/images?action=initializeUpload'
const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION ?? '202506'

function orgUrn(account: SocialAccount): string | null {
  return account.external_account_id ?? process.env.LINKEDIN_ORG_URN ?? null
}

function liHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  }
}

/** Pure: the /rest/posts body. `commentary` carries copy + hashtags; an image URN
 *  (once uploaded) is attached via content.media. */
export function buildLinkedInPost(post: SocialPost, authorUrn: string, imageUrn?: string) {
  const tags = post.hashtags.length ? `\n\n${post.hashtags.join(' ')}` : ''
  const body: Record<string, unknown> = {
    author: authorUrn,
    commentary: `${post.copy}${tags}`,
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }
  if (imageUrn) body.content = { media: { id: imageUrn, title: 'RightAIChoice' } }
  return body
}

/** Images API: initializeUpload (owner=org) → PUT the PNG → return the asset URN. */
async function uploadImage(
  token: string,
  orgUrnValue: string,
  graphicUrl: string,
): Promise<{ ok: true; urn: string } | { ok: false; error: string; retryable: boolean }> {
  const init = await postJson(IMAGES_INIT_URL, { initializeUploadRequest: { owner: orgUrnValue } }, liHeaders(token))
  const uploadUrl = init.json?.value?.uploadUrl as string | undefined
  const imageUrn = init.json?.value?.image as string | undefined
  if (!(init.status === 200 && uploadUrl && imageUrn)) {
    return { ok: false, error: `image init ${init.status}: ${init.text.slice(0, 150)}`, retryable: isRetryableStatus(init.status) }
  }
  const img = await fetch(graphicUrl)
  if (!img.ok) return { ok: false, error: `media fetch ${img.status}`, retryable: true }
  const bytes = Buffer.from(await img.arrayBuffer())
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: bytes })
  if (!put.ok) return { ok: false, error: `image PUT ${put.status}`, retryable: isRetryableStatus(put.status) }
  return { ok: true, urn: imageUrn }
}

export const linkedinPublisher: Publisher = {
  platform: 'linkedin',

  isEnabled(account: SocialAccount | null): boolean {
    if (process.env.LINKEDIN_ENABLED !== '1') return false
    return (
      !!account &&
      account.status === 'connected' &&
      notPaused(account) &&
      tokenUsable(account.access_token, account.token_expires_at) &&
      !!orgUrn(account)
    )
  },

  async publish(post: SocialPost, account: SocialAccount, opts: PublishOpts): Promise<PublishResult> {
    const urn = orgUrn(account)
    if (!urn) return fail('linkedin: no organization URN configured', false)
    const token = account.access_token!

    let imageUrn: string | undefined
    if (post.graphic_template && opts.graphicUrl) {
      const up = await uploadImage(token, urn, opts.graphicUrl)
      if (!up.ok) return fail(`linkedin image: ${up.error}`, up.retryable)
      imageUrn = up.urn
    }

    const { status, json, text, headers } = await postJson(POSTS_URL, buildLinkedInPost(post, urn, imageUrn), liHeaders(token))
    // The post URN comes back in the x-restli-id header (preferred) or body id.
    // Require a REAL id — never report success without one.
    const id = (headers['x-restli-id'] as string | undefined) ?? (json?.id as string | undefined)
    if ((status === 200 || status === 201) && id) {
      return { ok: true, externalId: id, externalUrl: `https://www.linkedin.com/feed/update/${id}`, costUsd: 0 }
    }
    if (status === 200 || status === 201) {
      return fail(`linkedin ${status}: success status but no post id returned`, true)
    }
    return fail(`linkedin ${status}: ${text.slice(0, 200)}`, isRetryableStatus(status))
  },

  // Org share statistics need a separate API + lookback window; deferred.
  async fetchMetrics(): Promise<MetricsResult> {
    return null
  },
}
