// Phase 13 D1.1 — Originality-density audit (READ-ONLY, pure scoring).
//
// Google's May-2026 core update demotes thin, programmatically-generated pages.
// Scores every published page 0–100 on "original value density" and buckets it:
//   keep        → rich proprietary data AND/OR already earns impressions.
//   enrich      → has potential but thin (mid score, some signal) → expand.
//   consolidate → thin AND ~zero 28-day impressions → 308-redirect into a hub later.
//
// Pure: takes already-loaded page data + a 28-day impressions number, returns a
// deterministic verdict. The runner (scripts/audit-originality.ts) does the IO.

export type Bucket = 'keep' | 'enrich' | 'consolidate'
export type PageType = 'tool' | 'compare'

export type ScoreBreakdown = {
  proprietary: number
  text: number
  freshness: number
  impressions: number
}

export type AuditVerdict = {
  url: string
  type: PageType
  slug: string
  score: number
  bucket: Bucket
  impressions28d: number
  coverageState: string | null
  breakdown: ScoreBreakdown
  reasons: string[]
}

const DAY = 86_400_000
const KEEP_SCORE = 60
const ENRICH_FLOOR = 35
const KEEP_IMPRESSIONS = 20
const SOME_IMPRESSIONS = 1

function daysSince(ts: string | null | undefined): number | null {
  if (!ts) return null
  const t = new Date(ts).getTime()
  if (Number.isNaN(t)) return null
  return (Date.now() - t) / DAY
}

function impressionsPoints(impr: number): number {
  if (impr >= 100) return 30
  if (impr >= 20) return 22
  if (impr >= 5) return 14
  if (impr >= 1) return 7
  return 0
}

function freshnessPoints(ts: string | null | undefined, max: number): number {
  const d = daysSince(ts)
  if (d === null) return 0
  if (d <= 30) return max
  if (d <= 90) return Math.round(max * 0.6)
  if (d <= 180) return Math.round(max * 0.3)
  return 0
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

export type ToolAuditInput = {
  slug: string
  name: string
  tagline: string | null
  pricing_type: string | null
  viability_score: number | null
  github_stars: number | null
  last_verified_at: string | null
  categories: string[]
  impressions28d: number
  coverageState?: string | null
}

export function scoreTool(t: ToolAuditInput): AuditVerdict {
  const reasons: string[] = []

  let proprietary = 0
  if (t.viability_score != null) proprietary += 14
  else reasons.push('no viability score')
  if ((t.github_stars ?? 0) > 0) proprietary += 8
  if (t.pricing_type) proprietary += 8
  else reasons.push('no pricing data')
  proprietary += clamp(t.categories.length * 4, 0, 12)
  if (t.categories.length === 0) reasons.push('uncategorised')
  proprietary += freshnessPoints(t.last_verified_at, 8)
  proprietary = clamp(proprietary, 0, 50)

  const taglineLen = (t.tagline ?? '').trim().length
  let text = 0
  if (taglineLen >= 120) text = 20
  else if (taglineLen >= 60) text = 13
  else if (taglineLen >= 25) text = 7
  else if (taglineLen > 0) text = 3
  else reasons.push('no tagline')

  const freshness = freshnessPoints(t.last_verified_at, 20)
  if (freshness === 0) reasons.push('stale / never verified')

  const impressions = impressionsPoints(t.impressions28d)
  const score = clamp(proprietary + text + freshness + impressions, 0, 100)
  const bucket = bucketFor(score, t.impressions28d)
  if (t.impressions28d === 0) reasons.push('zero 28d impressions')

  return {
    url: `/tools/${t.slug}`,
    type: 'tool',
    slug: t.slug,
    score,
    bucket,
    impressions28d: t.impressions28d,
    coverageState: t.coverageState ?? null,
    breakdown: { proprietary, text, freshness, impressions },
    reasons,
  }
}

export type CompareAuditInput = {
  slug: string
  is_editorial: boolean
  verdict: string | null
  feature_analysis: string | null
  pricing_analysis: string | null
  tldrLen: number
  useCasesLen: number
  faqsLen: number
  benchmarksLen: number
  last_reviewed_at: string | null
  published_at: string | null
  impressions28d: number
  coverageState?: string | null
}

export function scoreCompare(c: CompareAuditInput): AuditVerdict {
  const reasons: string[] = []

  let proprietary = 0
  if (c.is_editorial) proprietary += 8
  else reasons.push('not editorial')
  proprietary += clamp(c.tldrLen * 3, 0, 12)
  proprietary += clamp(c.useCasesLen * 3, 0, 12)
  proprietary += clamp(c.faqsLen * 2, 0, 8)
  proprietary += clamp(c.benchmarksLen * 2, 0, 5)
  proprietary = clamp(proprietary, 0, 45)
  if (c.tldrLen === 0 && c.useCasesLen === 0 && c.benchmarksLen === 0) {
    reasons.push('no structured comparison tables')
  }

  const proseLen =
    (c.verdict ?? '').trim().length +
    (c.feature_analysis ?? '').trim().length +
    (c.pricing_analysis ?? '').trim().length
  let text = 0
  if (proseLen >= 2000) text = 30
  else if (proseLen >= 1000) text = 22
  else if (proseLen >= 400) text = 13
  else if (proseLen >= 100) text = 6
  else reasons.push('thin / no editorial prose')

  const freshness = freshnessPoints(c.last_reviewed_at ?? c.published_at, 15)
  if (freshness === 0) reasons.push('never reviewed / stale')

  const impressions = impressionsPoints(c.impressions28d)
  const score = clamp(proprietary + text + freshness + impressions, 0, 100)
  const bucket = bucketFor(score, c.impressions28d)
  if (c.impressions28d === 0) reasons.push('zero 28d impressions')

  return {
    url: `/compare/${c.slug}`,
    type: 'compare',
    slug: c.slug,
    score,
    bucket,
    impressions28d: c.impressions28d,
    coverageState: c.coverageState ?? null,
    breakdown: { proprietary, text, freshness, impressions },
    reasons,
  }
}

export function bucketFor(score: number, impressions28d: number): Bucket {
  if (impressions28d >= KEEP_IMPRESSIONS) return 'keep'
  if (score >= KEEP_SCORE) return 'keep'
  if (score < ENRICH_FLOOR && impressions28d < SOME_IMPRESSIONS) return 'consolidate'
  return 'enrich'
}

export type BucketCounts = Record<Bucket, number>
export function emptyCounts(): BucketCounts {
  return { keep: 0, enrich: 0, consolidate: 0 }
}
export function tally(verdicts: AuditVerdict[]): BucketCounts {
  const c = emptyCounts()
  for (const v of verdicts) c[v.bucket] += 1
  return c
}
