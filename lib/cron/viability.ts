import { getAdminClient } from './supabase-admin'

/**
 * Viability Score — 6-signal model (0–100)
 *
 * | Signal                  | Weight | Score range |
 * |-------------------------|--------|-------------|
 * | Wrapper dependency      |   30%  | 0 or 100   |
 * | GitHub activity         |   20%  | 0–100       |
 * | Funding runway          |   20%  | 0–100       |
 * | Hyperscaler overlap     |   15%  | 0 or 100   |
 * | Category mortality rate |   10%  | 0–100       |
 * | Website health          |    5%  | 0 or 100   |
 */

export type ViabilitySignals = {
  wrapper_dependency: number
  github_activity: number
  funding_runway: number
  hyperscaler_overlap: number
  category_mortality: number
  website_health: number
}

const WEIGHTS = {
  wrapper_dependency: 0.3,
  github_activity: 0.2,
  funding_runway: 0.2,
  hyperscaler_overlap: 0.15,
  category_mortality: 0.1,
  website_health: 0.05,
} as const

export function computeViabilityScore(signals: ViabilitySignals): number {
  let total = 0
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    total += (signals[key as keyof ViabilitySignals] ?? 50) * weight
  }
  return Math.round(Math.max(0, Math.min(100, total)))
}

// --- Signal calculators ---

/** Wrapper dependency: is_wrapper flag = 0 (high risk), else 100 */
function calcWrapperDependency(tool: ToolRow): number {
  return tool.is_wrapper ? 0 : 100
}

/** GitHub activity: based on github_stars and existence of github_url */
function calcGithubActivity(tool: ToolRow): number {
  if (!tool.github_url) return 50 // neutral — not all tools are OSS
  const stars = tool.github_stars ?? 0
  if (stars >= 10000) return 100
  if (stars >= 1000) return 85
  if (stars >= 100) return 65
  if (stars >= 10) return 45
  return 25
}

/** Funding: based on created_at age + pricing type as proxy */
function calcFundingRunway(tool: ToolRow): number {
  // Tools with paid tiers likely have revenue
  if (tool.pricing_type === 'paid' || tool.pricing_type === 'freemium') return 80
  if (tool.pricing_type === 'free') return 40
  return 60 // enterprise, contact_sales = likely funded
}

/** Hyperscaler overlap: manual flag via is_wrapper or heuristic */
function calcHyperscalerOverlap(_tool: ToolRow): number {
  // Phase 1: no automated detection, default to safe
  // In future: RSS monitoring for Google/MS/OpenAI feature launches
  return 80
}

/** Category mortality: how many tools in the same category have died */
function calcCategoryMortality(_tool: ToolRow, _categoryDeathRates: Record<string, number>): number {
  // Phase 1: use flat rate (industry avg ~29% AI tool mortality)
  // In future: per-category rate from dang.ai data
  return 70
}

/** Website health: tool has a website URL = basic pass */
function calcWebsiteHealth(tool: ToolRow): number {
  if (!tool.website_url) return 0
  // Phase 1: assume site is up if URL exists
  // In future: actual uptime monitoring
  return 90
}

type ToolRow = {
  id: string
  slug: string
  is_wrapper: boolean
  github_url: string | null
  github_stars: number | null
  pricing_type: string
  website_url: string | null
  created_at: string
}

export function calculateSignals(tool: ToolRow): ViabilitySignals {
  return {
    wrapper_dependency: calcWrapperDependency(tool),
    github_activity: calcGithubActivity(tool),
    funding_runway: calcFundingRunway(tool),
    hyperscaler_overlap: calcHyperscalerOverlap(tool),
    category_mortality: calcCategoryMortality(tool, {}),
    website_health: calcWebsiteHealth(tool),
  }
}

/**
 * Process a batch of tools: calculate signals → compute score → update DB.
 * Returns count of tools updated.
 */
export async function calculateViabilityBatch(batchSize = 50): Promise<{
  processed: number
  errors: string[]
}> {
  const db = getAdminClient()
  const errors: string[] = []

  // Select tools that either have no viability score or the oldest scores
  const { data: tools, error: fetchError } = await db
    .from('tools')
    .select('id, slug, is_wrapper, github_url, github_stars, pricing_type, website_url, created_at')
    .eq('is_published', true)
    .order('viability_updated_at', { ascending: true, nullsFirst: true })
    .limit(batchSize)

  if (fetchError || !tools) {
    return { processed: 0, errors: [fetchError?.message ?? 'Failed to fetch tools'] }
  }

  let processed = 0

  for (const tool of tools) {
    try {
      const signals = calculateSignals(tool as ToolRow)
      const score = computeViabilityScore(signals)

      const { error: updateError } = await db
        .from('tools')
        .update({
          viability_score: score,
          viability_signals: signals,
          viability_updated_at: new Date().toISOString(),
        })
        .eq('id', tool.id)

      if (updateError) {
        errors.push(`${tool.slug}: ${updateError.message}`)
      } else {
        processed++
      }
    } catch (err) {
      errors.push(`${tool.slug}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { processed, errors }
}
