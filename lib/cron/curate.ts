import { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils/slugify'
import type { EnrichedToolData } from './enrich'

/**
 * Discovery-time signals the curation gate uses alongside the enriched
 * payload. Populated by whichever source produced the candidate (Apify
 * scraper, GitHub trending, ProductHunt listing, etc). Every field is
 * optional — the gate awards partial credit per plan §41.
 */
export interface CandidateSignals {
  /** Source is a recency-filtered list → trending. Set true for PH last-90d, TAAFT /new/, Futurepedia newest, G2 Best AI. */
  recentList?: boolean
  /** GitHub stars. Used for open-source "growing" signal. */
  githubStars?: number
  /** GitHub stars added in last 30 days. Alternative growing signal. */
  githubStarsMoM?: number
  /** Funding mentioned (raised $X, Series A/B/Seed) in description or page text. */
  fundingMentioned?: boolean
  /** Traffic trend from Similarweb or similar: "up" | "flat" | "down" | null. */
  trafficTrend?: 'up' | 'flat' | 'down' | null
  /** Any review-count / rating / user-count / Reddit-thread / PH-vote signal of active usage. */
  usageSignal?: {
    reviewCount?: number
    rating?: number
    redditThreads?: number
    userCountClaim?: string
    /** Product Hunt launch upvotes — real interest/usage signal. */
    phVotes?: number
  }
  /**
   * Phase 8 traction-hard gate (2026-05-16). Populated by
   * `lib/cron/traction-probe.ts` for each candidate before curation.
   * When present, candidates without hardPass=true are HARD-rejected
   * regardless of how many soft criteria they pass.
   */
  tractionHard?: {
    hnPoints: number
    githubStars: number
    phVotes: number
    redditThreads: number
    score: number
    hardPass: boolean
    /** 2026-07-01 — at least one RELIABLE source (HN/GitHub/Product Hunt)
     *  responded. Reddit is a bonus signal and is deliberately excluded, so a
     *  Reddit outage never authorizes a hard-reject. When false the probe was
     *  inconclusive and curate must fall through to the soft criteria. */
    probed?: boolean
  }
}

export interface CurateContext {
  /** Slugs already present in `tools` (any publication state) */
  existingSlugs: Set<string>
  /** Minimum viability proxy for the "not wrapper-of-wrapper" check */
  minViabilityProxy: number
  /** Total tool count — used to compute the category share threshold */
  totalTools: number
  /** Per-category counts in the existing catalog, keyed by category slug */
  categoryCounts: Map<string, number>
  /** Category slug is considered a "gap" if its share < gapThreshold of total */
  gapThreshold: number
  /**
   * Minimum number of plan criteria (out of 5) a candidate must pass.
   * Default 3 for bulk scale-catalog runs (matches plan §41). Cron freshness
   * sets this to 2 because it can't cheaply compute category-gap within the
   * 60s Vercel budget per run.
   */
  minCriteria: number
}

export interface CurateInput {
  name: string
  websiteUrl: string
  enriched: EnrichedToolData
  signals?: CandidateSignals
  /** Predicted categories for this candidate. Used for the category-gap check. */
  predictedCategories?: string[]
}

export interface CriterionResult {
  name: 'trending' | 'growing' | 'in-use' | 'category-gap' | 'viability'
  passed: boolean
  detail: string
}

export interface CurateDecision {
  pass: boolean
  reasons: string[]
  criteria: CriterionResult[]
  criteriaPassed: number
  viabilityProxy: number
  slug: string
}

export async function loadCurateContext(supabase: SupabaseClient): Promise<CurateContext> {
  const [toolsRes, relsRes, catsRes] = await Promise.all([
    supabase.from('tools').select('slug'),
    supabase.from('tool_categories').select('category_id'),
    supabase.from('categories').select('id, slug'),
  ])

  const existingSlugs = new Set<string>()
  for (const row of (toolsRes.data ?? []) as { slug: string }[]) {
    if (row.slug) existingSlugs.add(row.slug)
  }

  const idToSlug = new Map<string, string>()
  for (const row of (catsRes.data ?? []) as { id: string; slug: string }[]) {
    idToSlug.set(row.id, row.slug)
  }

  const categoryCounts = new Map<string, number>()
  for (const row of (relsRes.data ?? []) as { category_id: string }[]) {
    const slug = idToSlug.get(row.category_id)
    if (!slug) continue
    categoryCounts.set(slug, (categoryCounts.get(slug) ?? 0) + 1)
  }

  return {
    existingSlugs,
    minViabilityProxy: 30,
    totalTools: existingSlugs.size,
    categoryCounts,
    gapThreshold: 0.03, // any category <3% of catalog counts as a gap
    minCriteria: 3, // plan §41 default; cron override to 2
  }
}

/**
 * Plan §41 curation gate. A candidate passes only if:
 *   1. Basics clear (name, URL, tagline, description, slug-uniqueness)
 *   2. ≥3 of 5 plan selection criteria satisfied:
 *        - Trending       (recent-list source)
 *        - Growing        (GitHub stars/MoM, funding, traffic trend)
 *        - In-use         (reviews, rating, Reddit threads, user claims)
 *        - Category gap   (fills undersupplied category in current catalog)
 *        - Viability      (viability proxy ≥ 30)
 *
 * Basic-check failures are hard rejects. Criteria are additive; a tool can
 * pass on e.g. viability + trending + category-gap even with no GitHub or
 * review signals, which keeps the bar honest for closed-source SaaS tools
 * that don't expose star counts.
 */
export function curateCandidate(input: CurateInput, ctx: CurateContext): CurateDecision {
  const reasons: string[] = []
  const slug = slugify(input.name)

  if (!input.name?.trim()) reasons.push('missing-name')
  if (!input.websiteUrl?.trim() || !/^https?:\/\//i.test(input.websiteUrl)) reasons.push('bad-url')
  if (!input.enriched.tagline?.trim()) reasons.push('missing-tagline')
  if (!input.enriched.description?.trim() || input.enriched.description.length < 120) reasons.push('thin-description')
  if (ctx.existingSlugs.has(slug)) reasons.push('slug-collision')

  // Traction-hard gate: if a traction probe was attached AND it didn't hardPass,
  // reject. Tools that "appeared on a list" but have zero real-world adoption get
  // filtered here. Skipped when the probe wasn't run (legacy scale-catalog path).
  //
  // Only HARD-reject when the probe actually got a read (`probed !== false`).
  // `probed` is true when at least one RELIABLE source (HN/GitHub/Product Hunt)
  // responded — the aggregate is an OR-of-many, so a single blocked/flaky source
  // can't force a false reject (the 2026-07-01 multi-source rework; the earlier
  // Reddit-only gate froze ingestion for weeks when Reddit went dark). When the
  // whole probe was inconclusive we fall through to the soft criteria, and every
  // ingest inserts as a DRAFT so the onboard SOP lane remains the real publish bar.
  const t = input.signals?.tractionHard
  if (t && t.probed !== false && !t.hardPass) {
    reasons.push(
      `traction-hard:hn=${t.hnPoints}/gh=${t.githubStars}/ph=${t.phVotes}/reddit=${t.redditThreads}/score=${Math.round(t.score)}`,
    )
  }

  const viabilityProxy = estimateViabilityProxy(input.enriched)

  const criteria: CriterionResult[] = [
    evalTrending(input.signals),
    evalGrowing(input.signals),
    evalInUse(input.signals, input.enriched),
    evalViability(viabilityProxy, ctx.minViabilityProxy),
  ]
  // Phase 10 #65 — the category-gap criterion only applies when categories were
  // actually predicted. The ingest path doesn't predict pre-gate, so including it
  // unconditionally made it a permanent "always-fail" that misrepresented the
  // "X of 5" bar. Count it only when we have the data.
  if (input.predictedCategories && input.predictedCategories.length > 0) {
    criteria.push(evalCategoryGap(input.predictedCategories, ctx))
  }

  const criteriaPassed = criteria.filter((c) => c.passed).length
  if (criteriaPassed < ctx.minCriteria) {
    reasons.push(`criteria:${criteriaPassed}/${criteria.length}<min${ctx.minCriteria}`)
    for (const c of criteria) {
      if (!c.passed) reasons.push(`miss-${c.name}`)
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    criteria,
    criteriaPassed,
    viabilityProxy,
    slug,
  }
}

function evalTrending(signals?: CandidateSignals): CriterionResult {
  if (signals?.recentList) {
    return { name: 'trending', passed: true, detail: 'recent-list' }
  }
  return { name: 'trending', passed: false, detail: 'no-recent-list' }
}

function evalGrowing(signals?: CandidateSignals): CriterionResult {
  if (!signals) return { name: 'growing', passed: false, detail: 'no-signals' }
  if ((signals.githubStarsMoM ?? 0) >= 50) {
    return { name: 'growing', passed: true, detail: `stars-mom=${signals.githubStarsMoM}` }
  }
  // ≥150 stars on the name-matched repo = a real, published, adopted tool. Tuned
  // for the emerging-AI catalog (2026-07-01); the SOP lane is the real publish bar.
  if ((signals.githubStars ?? 0) >= 150) {
    return { name: 'growing', passed: true, detail: `stars=${signals.githubStars}` }
  }
  if (signals.fundingMentioned) {
    return { name: 'growing', passed: true, detail: 'funding-mention' }
  }
  if (signals.trafficTrend === 'up') {
    return { name: 'growing', passed: true, detail: 'traffic-up' }
  }
  // A sizable Product Hunt launch is a growth signal for new tools (2026-07-01).
  if ((signals.usageSignal?.phVotes ?? 0) >= 300) {
    return { name: 'growing', passed: true, detail: `ph-votes=${signals.usageSignal?.phVotes}` }
  }
  return { name: 'growing', passed: false, detail: 'no-growth-signal' }
}

function evalInUse(signals: CandidateSignals | undefined, enriched: EnrichedToolData): CriterionResult {
  const us = signals?.usageSignal
  if ((us?.reviewCount ?? 0) >= 20) {
    return { name: 'in-use', passed: true, detail: `reviews=${us?.reviewCount}` }
  }
  if ((us?.rating ?? 0) >= 4.0 && (us?.reviewCount ?? 0) >= 5) {
    return { name: 'in-use', passed: true, detail: `rating=${us?.rating}/${us?.reviewCount}` }
  }
  if ((us?.redditThreads ?? 0) >= 3) {
    return { name: 'in-use', passed: true, detail: `reddit=${us?.redditThreads}` }
  }
  // A solid Product Hunt launch = real people trying it (2026-07-01).
  if ((us?.phVotes ?? 0) >= 100) {
    return { name: 'in-use', passed: true, detail: `ph-votes=${us?.phVotes}` }
  }
  const g2 = enriched.community_links?.g2_rating
  if (g2 != null && g2 >= 4.0) {
    return { name: 'in-use', passed: true, detail: `g2-rating=${g2}` }
  }
  if (us?.userCountClaim?.trim()) {
    return { name: 'in-use', passed: true, detail: 'user-claim' }
  }
  return { name: 'in-use', passed: false, detail: 'no-usage-signal' }
}

function evalCategoryGap(
  predictedCategories: string[] | undefined,
  ctx: CurateContext,
): CriterionResult {
  if (!predictedCategories || predictedCategories.length === 0) {
    return { name: 'category-gap', passed: false, detail: 'no-categories' }
  }
  const total = Math.max(ctx.totalTools, 1)
  for (const cat of predictedCategories) {
    const count = ctx.categoryCounts.get(cat) ?? 0
    const share = count / total
    if (share < ctx.gapThreshold) {
      return {
        name: 'category-gap',
        passed: true,
        detail: `${cat}:${(share * 100).toFixed(1)}%`,
      }
    }
  }
  return { name: 'category-gap', passed: false, detail: 'all-cats-saturated' }
}

function evalViability(proxy: number, min: number): CriterionResult {
  return {
    name: 'viability',
    passed: proxy >= min,
    detail: `${proxy}>=${min}`,
  }
}

function estimateViabilityProxy(e: EnrichedToolData): number {
  let score = 60
  if (e.pricing_type === 'paid' || e.pricing_type === 'freemium') score += 15
  else if (e.pricing_type === 'free') score -= 10
  if (e.has_api) score += 10
  if ((e.features ?? []).length >= 3) score += 5
  if ((e.features ?? []).length === 0) score -= 20
  if (!e.tagline?.trim()) score -= 30
  if ((e.editorial_verdict ?? '').length >= 80) score += 5
  // Depth signals — reward tools whose enrichment produced substantive content
  if ((e.use_cases ?? []).length >= 3) score += 5
  if ((e.not_for ?? []).length >= 2) score += 5
  if ((e.integrations ?? []).length >= 3) score += 3
  return Math.max(0, Math.min(100, score))
}
