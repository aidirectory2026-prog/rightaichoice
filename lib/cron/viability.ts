import { getAdminClient } from './supabase-admin'

/**
 * Viability Score — 5-signal model (0–100)
 *
 * Phase 11 C1 (2026-06-18) recalibration. The old model clustered every tool in
 * 72–90 (nothing below 72, /viability/at-risk empty) because three signals were
 * effectively constant: hyperscaler_overlap was hardcoded 80, category_mortality
 * hardcoded 70, and the not-a-wrapper signal carried 30% weight — so any
 * non-wrapper tool with a website floored at ~72. This model drops the two
 * hardcoded signals, lowers the wrapper floor, and adds a real, high-variance
 * signal — momentum (how recently the tool actually shipped/was talked about),
 * mined from the latest_updates the freshness pipeline already captures.
 *
 * | Signal             | Weight | What it measures                              |
 * |--------------------|--------|-----------------------------------------------|
 * | Momentum           |  40%   | recency of real news/changelog activity        |
 * | Wrapper dependency |  30%   | thin-wrapper vs independent product (LLM flag) |
 * | Funding runway     |  20%   | revenue model as a funding proxy               |
 * | Website health     |  10%   | has a live presence                            |
 *
 * Dropped GitHub activity from the old model — only 7/2,070 tools have a github_url,
 * so it was a dead constant. `wrapper_dependency` reads the real `is_wrapper` flag,
 * which the deep SOP (backfill-tool-data.ts) now populates via an LLM judgment — so
 * this signal is constant (100) until a tool is deep-refreshed, then becomes real.
 * (C3 will layer real per-category mortality + hyperscaler-overlap RSS monitoring.)
 */

export type ViabilitySignals = {
  momentum: number
  wrapper_dependency: number
  funding_runway: number
  website_health: number
}

const WEIGHTS = {
  momentum: 0.4,
  wrapper_dependency: 0.3,
  funding_runway: 0.2,
  website_health: 0.1,
} as const

export function computeViabilityScore(signals: ViabilitySignals): number {
  let total = 0
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    total += (signals[key as keyof ViabilitySignals] ?? 50) * weight
  }
  return Math.round(Math.max(0, Math.min(100, total)))
}

// --- Signal calculators ---

/**
 * Momentum: how recently the tool actually shipped or was covered. Mined from the
 * newest dated item in latest_updates (the freshness pipeline's news/changelog
 * feed). A tool with a launch/feature in the last quarter is demonstrably alive;
 * one whose newest signal is 2+ years old is an abandonment risk. No captured
 * signal → neutral (we may simply lack data — don't over-penalize).
 */
function calcMomentum(tool: ToolRow): number {
  const lu = Array.isArray(tool.latest_updates) ? (tool.latest_updates as Array<{ date?: string }>) : []
  let newest = 0
  for (const it of lu) {
    const t = it?.date ? Date.parse(it.date) : NaN
    if (!Number.isNaN(t) && t > newest) newest = t
  }
  if (newest === 0) return 55 // no dated signal — neutral
  const days = (Date.now() - newest) / 86_400_000
  if (days <= 90) return 100
  if (days <= 180) return 82
  if (days <= 365) return 62
  if (days <= 730) return 38
  return 18
}

/** Wrapper dependency: a thin wrapper rides entirely on a model it doesn't own. */
function calcWrapperDependency(tool: ToolRow): number {
  return tool.is_wrapper ? 15 : 100
}

/** Funding runway: revenue model as a proxy — paid/freemium signals real revenue. */
function calcFundingRunway(tool: ToolRow): number {
  if (tool.pricing_type === 'paid' || tool.pricing_type === 'freemium') return 80
  if (tool.pricing_type === 'free') return 40
  return 70 // enterprise / contact-sales = likely funded
}

/** Website health: a live web presence. */
function calcWebsiteHealth(tool: ToolRow): number {
  return tool.website_url ? 90 : 0
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
  latest_updates: unknown
}

export function calculateSignals(tool: ToolRow): ViabilitySignals {
  return {
    momentum: calcMomentum(tool),
    wrapper_dependency: calcWrapperDependency(tool),
    funding_runway: calcFundingRunway(tool),
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
    .select('id, slug, is_wrapper, github_url, github_stars, pricing_type, website_url, created_at, latest_updates')
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

      // viability columns added via migration 026 — not in generated Supabase types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (db as any)
        .from('tools')
        .update({
          viability_score: score,
          viability_signals: signals,
          viability_updated_at: new Date().toISOString(),
        })
        .eq('id', (tool as ToolRow).id)

      if (updateError) {
        errors.push(`${(tool as ToolRow).slug}: ${updateError.message}`)
      } else {
        processed++
      }
    } catch (err) {
      errors.push(`${(tool as ToolRow).slug}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { processed, errors }
}
