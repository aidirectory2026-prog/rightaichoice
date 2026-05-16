import type { UserProfile } from './user-profile'
import { BUDGET_MAX } from './user-profile'

type ToolForScoring = {
  name: string
  pricing_type: string
  skill_level?: string | null
  best_for?: string[] | null
  integrations?: string[] | null
  sentimentScore?: string | null
}

export type MatchScore = {
  score: number
  reasons: string[]
  warnings: string[]
  budgetFit: 'fits' | 'over' | 'unknown'
  integrationMatches: string[]
  replaces: string[]
}

const PRICING_COST: Record<string, number> = {
  free: 0,
  freemium: 0, // has free tier
  paid: 30,
  subscription: 30,
  one_time: 50,
  enterprise: 500,
}

const SKILL_RANK: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 3,
}

const INDUSTRY_TO_KEYWORDS: Record<string, string[]> = {
  marketing: ['marketing', 'marketer', 'growth', 'seo', 'content', 'social'],
  dev: ['developer', 'engineer', 'coding', 'technical', 'programmer'],
  design: ['designer', 'creative', 'visual', 'ui', 'ux'],
  sales: ['sales', 'revenue', 'crm', 'outbound'],
  education: ['teacher', 'student', 'learning', 'course', 'educator'],
  content: ['creator', 'writer', 'video', 'podcast', 'blogger'],
  other: [],
}

/**
 * Deterministic match score (0–100) for a tool against a user's profile.
 * No API calls, pure function, explainable.
 */
export function computeMatchScore(tool: ToolForScoring, profile: UserProfile): MatchScore {
  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []

  // ── Budget (30 pts) ─────────────────────────────────────────
  const budgetMax = BUDGET_MAX[profile.budget]
  const toolCost = PRICING_COST[tool.pricing_type] ?? 30
  let budgetFit: 'fits' | 'over' | 'unknown' = 'unknown'
  if (tool.pricing_type === 'free' || tool.pricing_type === 'freemium') {
    score += 30
    reasons.push('Free tier fits your budget')
    budgetFit = 'fits'
  } else if (toolCost <= budgetMax) {
    score += 25
    reasons.push(`Within your ${profile.budget === 'no_limit' ? 'unlimited' : 'budget'} range`)
    budgetFit = 'fits'
  } else {
    warnings.push(`~$${toolCost}/mo exceeds your ${budgetMax === 0 ? 'free-only' : `$${budgetMax}`} budget`)
    budgetFit = 'over'
  }

  // ── Skill level (20 pts) ────────────────────────────────────
  const toolSkillRank = tool.skill_level ? SKILL_RANK[tool.skill_level] ?? 2 : 2
  const userSkillRank = SKILL_RANK[profile.skill] ?? 2
  if (toolSkillRank <= userSkillRank) {
    score += 20
    reasons.push(`Matches your ${profile.skill} level`)
  } else if (toolSkillRank - userSkillRank === 1) {
    score += 10
    warnings.push('Slightly steeper learning curve for your level')
  } else {
    warnings.push('Steep learning curve for your current level')
  }

  // ── Integration with existing tools (15 pts) ────────────────
  const integrationMatches: string[] = []
  const userTools = profile.existingTools.map((t) => t.toLowerCase().trim()).filter(Boolean)
  if (userTools.length > 0 && tool.integrations) {
    for (const integ of tool.integrations) {
      const integLower = integ.toLowerCase()
      for (const ut of userTools) {
        if (integLower.includes(ut) || ut.includes(integLower)) {
          integrationMatches.push(integ)
          break
        }
      }
    }
  }
  if (integrationMatches.length > 0) {
    score += 15
    reasons.push(`Works with ${integrationMatches.slice(0, 2).join(', ')}`)
  }

  // ── Already-owned-by-user (positive boost, Phase 9 Stage 2 flip) ──
  // Before 2026-05-16 this was a -15 penalty + amber warning "You already
  // use this tool" — exactly backwards. A tool the user already owns +
  // already onboarded onto is HIGHER value than one they'd have to adopt
  // fresh. We now boost it by +10 and surface it as a positive reason
  // pill ("✓ You already own this"). The planner prompt (route.ts) also
  // instructs the LLM to slot existing tools into stages rather than
  // recommending duplicates, so this path mostly catches edge cases
  // where the LLM still recommends a duplicate.
  const replaces: string[] = []
  const toolNameLower = tool.name.toLowerCase()
  const alreadyOwned = userTools.some(
    (ut) => toolNameLower.includes(ut) || ut.includes(toolNameLower),
  )
  if (alreadyOwned) {
    score += 10
    reasons.push('✓ You already own this')
    // Track which of the user's existing tools this slot covers — the
    // UI uses this to render the green "slots in at {stageName}" sub-line.
    for (const ut of userTools) {
      if (toolNameLower.includes(ut) || ut.includes(toolNameLower)) {
        // Find the original-casing entry from profile.existingTools.
        const original = profile.existingTools.find(
          (t) => t.toLowerCase().trim() === ut,
        )
        if (original) replaces.push(original)
      }
    }
  } else {
    // Small boost for tools that AREN'T duplicates (rewards fresh picks
    // that genuinely fill a gap). Smaller than the existing-owned boost
    // so we don't dwarf the "you already own this" signal.
    score += 5
  }

  // ── Industry fit (10 pts) ───────────────────────────────────
  const keywords = INDUSTRY_TO_KEYWORDS[profile.industry] ?? []
  if (keywords.length > 0 && tool.best_for) {
    const bestForText = tool.best_for.join(' ').toLowerCase()
    if (keywords.some((k) => bestForText.includes(k))) {
      score += 10
      reasons.push(`Built for ${profile.industry}`)
    }
  }

  // ── Positive sentiment (10 pts) ─────────────────────────────
  if (tool.sentimentScore === 'positive') {
    score += 10
    reasons.push('Positive community buzz')
  } else if (tool.sentimentScore === 'negative') {
    warnings.push('Mixed community feedback')
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons: reasons.slice(0, 3),
    warnings: warnings.slice(0, 2),
    budgetFit,
    integrationMatches: integrationMatches.slice(0, 3),
    replaces,
  }
}

export function matchLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Strong match', color: 'emerald' }
  if (score >= 60) return { label: 'Good fit', color: 'cyan' }
  if (score >= 40) return { label: 'Decent fit', color: 'amber' }
  return { label: 'Limited fit', color: 'zinc' }
}
