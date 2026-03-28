// ── Tool types ────────────────────────────────────────────────────────────────

export type PricingType = 'free' | 'freemium' | 'paid' | 'contact'
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type Platform = 'web' | 'mobile' | 'desktop' | 'api' | 'plugin' | 'cli'

export interface Tool {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  logo_url: string | null
  website_url: string
  pricing_type: PricingType
  skill_level: SkillLevel
  has_api: boolean
  platforms: Platform[]
  categories: Category[]
  tags: Tag[]
  avg_rating: number
  review_count: number
  view_count: number
  is_featured: boolean
  is_sponsored: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  tool_count?: number
}

export interface Tag {
  id: string
  name: string
  slug: string
}

// ── User / Community types ────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  reputation: number
  review_count: number
  question_count: number
  answer_count: number
  created_at: string
}

export interface Review {
  id: string
  tool_id: string
  user_id: string
  rating: number
  pros: string
  cons: string
  use_case: string
  skill_level: SkillLevel
  upvotes: number
  created_at: string
  profile?: Profile
}

export interface Question {
  id: string
  tool_id: string
  user_id: string
  title: string
  body: string
  upvotes: number
  answer_count: number
  is_answered: boolean
  created_at: string
  profile?: Profile
}

export interface Answer {
  id: string
  question_id: string
  user_id: string
  body: string
  upvotes: number
  is_accepted: boolean
  created_at: string
  profile?: Profile
}

export interface Discussion {
  id: string
  tool_id: string
  user_id: string
  title: string
  body: string
  upvotes: number
  reply_count: number
  is_pinned: boolean
  created_at: string
  profile?: Profile
}

export interface DiscussionReply {
  id: string
  discussion_id: string
  user_id: string
  body: string
  upvotes: number
  created_at: string
  profile?: Profile
}

// ── Search / Filter types ────────────────────────────────────────────────────

export interface ToolFilters {
  category?: string
  pricing?: PricingType
  platform?: Platform
  skill_level?: SkillLevel
  has_api?: boolean
  search?: string
  sort?: 'trending' | 'newest' | 'most_reviewed' | 'alphabetical'
  page?: number
}

// ── AI / Workflow types ───────────────────────────────────────────────────────

// Stored in JSONB — denormalized for fast reads (no join needed)
export interface WorkflowStep {
  step: number
  name: string
  description: string
  tool_slug: string
  tool_name: string
  why: string
}

export interface Workflow {
  id: string
  title: string
  description: string
  goal: string
  steps: WorkflowStep[]
  user_id: string | null
  upvotes: number
  is_ai_generated: boolean
  is_published: boolean
  created_at: string
  profile?: Profile
}
