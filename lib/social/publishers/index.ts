// Phase 13 Social — publisher registry + orchestration helpers.
// The engine is platform-agnostic: it asks the registry for a publisher and calls
// the common interface. Platforms light up only when isEnabled() is true.

import { getAdminClient } from '../../cron/supabase-admin'
import { GRAPHIC_SIZES } from '../graphics/templates'
import type { Platform, SocialAccount, SocialPost } from '../types'
import { instagramPublisher } from './instagram'
import { linkedinPublisher } from './linkedin'
import { redditPublisher } from './reddit'
import type { Publisher, PublishResult } from './types'
import { xPublisher } from './x'

export const PUBLISHERS: Record<Platform, Publisher> = {
  x: xPublisher,
  reddit: redditPublisher,
  linkedin: linkedinPublisher,
  instagram: instagramPublisher,
}

export function getPublisher(platform: Platform): Publisher {
  return PUBLISHERS[platform]
}

/** Public URL of a post's rendered graphic (Instagram needs this to be reachable). */
export function publicGraphicUrl(postId: string): string {
  const origin = process.env.SOCIAL_PUBLIC_ORIGIN ?? 'https://rightaichoice.com'
  return `${origin.replace(/\/$/, '')}/api/social/graphic/${postId}`
}

export async function loadAccount(platform: Platform): Promise<SocialAccount | null> {
  const db = getAdminClient()
  const res = await db.from('social_accounts').select('*').eq('platform', platform).maybeSingle()
  return (res.data as SocialAccount | null) ?? null
}

/**
 * Orchestrate one publish: load the account, verify the platform is enabled, build
 * the graphic URL if the post has one, and call the publisher. Does NOT write the
 * DB — the caller (the publish cron, S6) records the outcome. Network-only.
 */
export async function publishOne(post: SocialPost): Promise<PublishResult> {
  const publisher = getPublisher(post.platform)
  const account = await loadAccount(post.platform)
  if (!publisher.isEnabled(account)) {
    return { ok: false, error: `${post.platform} not connected/enabled`, retryable: false }
  }
  const opts = post.graphic_template ? { graphicUrl: publicGraphicUrl(post.id) } : {}
  return publisher.publish(post, account as SocialAccount, opts)
}

export { GRAPHIC_SIZES }
