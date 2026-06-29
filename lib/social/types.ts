// Phase 13 Social Media Automation — shared types.

export type Platform = 'linkedin' | 'x' | 'instagram' | 'reddit'
export type PostKind = 'stat_card' | 'tool_spotlight' | 'news_roundup' | 'comparison' | 'quote' | 'text'
export type PostStatus = 'draft' | 'approved' | 'scheduled' | 'posted' | 'failed' | 'cancelled'

export type SourceRef = { title: string; url: string }

export type SocialPost = {
  id: string
  platform: Platform
  kind: PostKind
  status: PostStatus
  copy: string
  hashtags: string[]
  link_url: string | null
  graphic_template: string | null
  graphic_data: Record<string, unknown>
  graphic_size: string | null
  subreddit: string | null
  source_refs: SourceRef[]
  content_hash: string
  brain_meta: Record<string, unknown>
  scheduled_at: string | null
  posted_at: string | null
  external_post_id: string | null
  external_url: string | null
  cost_usd: number
  error: string | null
  created_at: string
  updated_at: string
}

export type SocialAccount = {
  id: string
  platform: Platform
  display_name: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  scope: string | null
  external_account_id: string | null // org URN / ig-user-id / reddit username
  status: 'connected' | 'disconnected' | 'error'
  meta: Record<string, unknown>
}

/** Result of a research pass an automation runs BEFORE acting (logged for transparency). */
export type ResearchResult = {
  ran: string // what was researched
  findings: Record<string, unknown>
}

/** A draft the brain proposes (pre-DB). */
export type DraftProposal = {
  platform: Platform
  kind: PostKind
  copy: string
  hashtags: string[]
  link_url?: string
  graphic_template?: string
  graphic_data?: Record<string, unknown>
  subreddit?: string
  source_refs: SourceRef[]
  content_hash: string
  brain_meta: Record<string, unknown>
  schedule_hint?: string
}
