// Phase 13 Social — common publisher contract. Each platform implements this;
// the engine stays platform-agnostic and platforms light up as creds/approvals land.

import type { Platform, SocialAccount, SocialPost } from '../types'

export type PublishResult =
  | { ok: true; externalId: string; externalUrl: string; costUsd: number }
  | { ok: false; error: string; retryable: boolean }

export type MetricsResult = {
  impressions?: number
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
  raw: Record<string, unknown>
} | null

export type PublishOpts = {
  /** Public URL of the rendered graphic (required by Instagram). */
  graphicUrl?: string
}

export interface Publisher {
  platform: Platform
  /** Wired on? (account connected + any required env present). Pure, no network. */
  isEnabled(account: SocialAccount | null): boolean
  /** Post it. Must NOT be called when isEnabled() is false. */
  publish(post: SocialPost, account: SocialAccount, opts: PublishOpts): Promise<PublishResult>
  /** Pull engagement for an already-posted item (best-effort; null if unsupported). */
  fetchMetrics(post: SocialPost, account: SocialAccount): Promise<MetricsResult>
}
