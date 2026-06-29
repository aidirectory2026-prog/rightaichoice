// Phase 13 D2.2 — "State of AI Tools" report data.
//
// Computes ORIGINAL statistics from our continuously-verified catalog — the kind
// of proprietary, citable data points that earn editorial backlinks and that LLMs
// quote ("according to RightAIChoice, X% of AI tools are free…"). Reuses the same
// single DB read as the citable dataset (loadDataset).

import { loadDataset, type Dataset } from './llms-dataset'
import { getAdminClient } from '../cron/supabase-admin'
import { VIABILITY_SAFE_BET, VIABILITY_AT_RISK } from '@/lib/viability'

const DAY = 86_400_000

export type StatRow = { label: string; count: number; pct: number }

export type StateOfAI = {
  generatedAt: string
  totalPublished: number
  verified7d: number
  verified7dPct: number
  latestVerify: string | null
  pricingMix: StatRow[]
  freeOrFreemiumPct: number
  viability: {
    scored: number
    avg: number | null
    atRisk: StatRow // < 40
    moderate: StatRow // 40–69
    strong: StatRow // >= 70
  }
  topCategories: StatRow[]
  withGithub: number
  totalStars: number
  topByStars: Array<{ name: string; slug: string; stars: number }>
  addedLast30d: number
}

const TITLE = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function buildStateOfAI(ds?: Dataset): Promise<StateOfAI> {
  const data = ds ?? (await loadDataset())
  return computeStats(data.tools, data.freshness.generatedAt)
}

// ── Per-category reports (Phase 13 D2.2b — programmatic linkable assets) ─────

export type CategoryReport = StateOfAI & { categoryName: string; categorySlug: string }

/** Categories (slug + name) for generateStaticParams + slug→name mapping. */
export async function getCategoryList(): Promise<Array<{ slug: string; name: string }>> {
  const db = getAdminClient()
  const { data } = await db.from('categories').select('slug, name').order('name')
  return ((data ?? []) as Array<{ slug: string; name: string }>).filter((c) => c.slug && c.name)
}

/** Same stats as the main report, scoped to one category (tools whose categories include categoryName). */
export async function buildStateOfCategory(
  categorySlug: string,
  categoryName: string,
  ds?: Dataset,
): Promise<CategoryReport> {
  const data = ds ?? (await loadDataset())
  const tools = data.tools.filter((t) => t.categories.includes(categoryName))
  return { ...computeStats(tools, data.freshness.generatedAt), categoryName, categorySlug }
}

/** Core stats computation, usable for the whole catalog or any filtered subset. */
function computeStats(tools: Dataset['tools'], generatedAt: string): StateOfAI {
  const total = tools.length
  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0)

  // Freshness — recomputed from the (possibly filtered) tool set.
  const now = Date.now()
  const verifyTimes = tools
    .map((t) => t.last_verified_at)
    .filter((t): t is string => !!t)
    .sort()
  const verified7d = tools.filter(
    (t) => t.last_verified_at && now - new Date(t.last_verified_at).getTime() <= 7 * DAY,
  ).length
  const latestVerify = verifyTimes.length ? verifyTimes[verifyTimes.length - 1] : null

  // Pricing mix
  const pricingCounts = new Map<string, number>()
  for (const t of tools) {
    const k = t.pricing_type || 'unknown'
    pricingCounts.set(k, (pricingCounts.get(k) ?? 0) + 1)
  }
  const pricingMix: StatRow[] = Array.from(pricingCounts.entries())
    .map(([label, count]) => ({ label: TITLE(label), count, pct: pct(count) }))
    .sort((a, b) => b.count - a.count)
  const freeOrFreemium = tools.filter((t) => t.pricing_type === 'free' || t.pricing_type === 'freemium').length

  // Viability buckets (BUG-39: shared thresholds, not magic numbers)
  const scored = tools.filter((t) => typeof t.viability_score === 'number')
  const atRisk = scored.filter((t) => (t.viability_score as number) < VIABILITY_AT_RISK).length
  const moderate = scored.filter((t) => (t.viability_score as number) >= VIABILITY_AT_RISK && (t.viability_score as number) < VIABILITY_SAFE_BET).length
  const strong = scored.filter((t) => (t.viability_score as number) >= VIABILITY_SAFE_BET).length
  const avg = scored.length
    ? Math.round(scored.reduce((s, t) => s + (t.viability_score as number), 0) / scored.length)
    : null
  const spct = (n: number) => (scored.length ? Math.round((n / scored.length) * 1000) / 10 : 0)

  // Categories
  const catCounts = new Map<string, number>()
  for (const t of tools) for (const c of t.categories) catCounts.set(c, (catCounts.get(c) ?? 0) + 1)
  const topCategories: StatRow[] = Array.from(catCounts.entries())
    .map(([label, count]) => ({ label, count, pct: pct(count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // GitHub
  const withGithub = tools.filter((t) => (t.github_stars ?? 0) > 0).length
  const totalStars = tools.reduce((s, t) => s + (t.github_stars ?? 0), 0)
  const topByStars = tools
    .filter((t) => (t.github_stars ?? 0) > 0)
    .sort((a, b) => (b.github_stars ?? 0) - (a.github_stars ?? 0))
    .slice(0, 5)
    .map((t) => ({ name: t.name, slug: t.slug, stars: t.github_stars as number }))

  return {
    generatedAt,
    totalPublished: total,
    verified7d,
    verified7dPct: pct(verified7d),
    latestVerify,
    pricingMix,
    freeOrFreemiumPct: pct(freeOrFreemium),
    viability: {
      scored: scored.length,
      avg,
      atRisk: { label: 'At risk (score < 40)', count: atRisk, pct: spct(atRisk) },
      moderate: { label: 'Moderate (40–69)', count: moderate, pct: spct(moderate) },
      strong: { label: 'Strong (70+)', count: strong, pct: spct(strong) },
    },
    topCategories,
    withGithub,
    totalStars,
    topByStars,
    addedLast30d: 0, // created_at not in the dataset projection; reserved for a later enrichment
  }
}
