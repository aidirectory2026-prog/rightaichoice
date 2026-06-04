/**
 * Phase 7G (2026-05-16): per-route title + meta patterns consolidated.
 *
 * Goals:
 * - Single source of truth for title formats — change once, propagate
 *   across all routes that adopt these helpers.
 * - Drop "Reviews" from titles (per 7G spec — most users searching
 *   for AI tools want "pricing", "features", "alternatives", not
 *   "reviews", which signals listicle/SEO-spam).
 * - Consistent year-suffix ("in 2026") for freshness signal in SERPs.
 * - Tight character budgets per route type (Google truncates ~60).
 *
 * Per-route title shapes:
 *   /tools/[slug]            → "{Name}: Pricing, Features & Alternatives in 2026"
 *   /tools/[slug]/alternatives → "{Name} Alternatives in 2026 — Compared by RightAIChoice"
 *   /tools/[slug]/report     → "{Name} Report — Independent Verdict & Sentiment"
 *   /compare/[slug]          → "{A} vs {B} — Side-by-Side Comparison (2026)"
 *   /compare                 → "Compare AI Tools — Side-by-Side Editorial Head-to-Heads"
 *   /categories/[slug]       → "Best {Category} AI Tools in 2026"
 *   /best/[slug]             → "Best {Topic} AI Tools — Tested + Ranked"
 *
 * Meta description is route-specific. Helpers pre-build common shapes;
 * pages can override the description prop where context demands it.
 */

const SITE = 'RightAIChoice'

export type ToolMetaInput = {
  name: string
  tagline?: string | null
  pricing_type?: string | null
  /** Phase 7J: drives <meta property="article:modified_time"> */
  updated_at?: string | null
  /** Phase 7J: drives <meta property="article:published_time"> */
  created_at?: string | null
}

function toIso(d: string | null | undefined): string | undefined {
  if (!d) return undefined
  const parsed = new Date(d)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export function buildToolPageMeta(t: ToolMetaInput, slug: string) {
  const title = `${t.name}: Pricing, Features & Alternatives in 2026`
  const desc = t.tagline
    ? `${t.tagline} See ${t.name}'s 2026 pricing, integrations, ratings, and the closest alternatives — independently reviewed by ${SITE}.`
    : `Independent ${t.name} review for 2026: pricing, features, integrations, ratings, and the closest alternatives. Picked by ${SITE} editorial.`
  const modified = toIso(t.updated_at)
  const published = toIso(t.created_at)
  return {
    title,
    description: desc.slice(0, 175),
    openGraph: {
      title,
      description: desc.slice(0, 175),
      url: `https://rightaichoice.com/tools/${slug}`,
      type: 'article' as const,
      siteName: SITE,
      ...(published && { publishedTime: published }),
      ...(modified && { modifiedTime: modified }),
      authors: [`${SITE} Editorial`],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description: desc.slice(0, 175),
    },
    alternates: {
      canonical: `https://rightaichoice.com/tools/${slug}`,
    },
    ...(modified && { other: { 'article:modified_time': modified } }),
  }
}

export function buildAlternativesPageMeta(toolName: string, slug: string) {
  const title = `${toolName} Alternatives in 2026 — Compared by ${SITE}`
  const desc = `The closest 2026 alternatives to ${toolName}, ranked by direct product-type match (not generic category overlap). Independent picks by ${SITE}.`
  return {
    title,
    description: desc,
    alternates: {
      canonical: `https://rightaichoice.com/tools/${slug}/alternatives`,
    },
  }
}

export type CompareMetaTimestamps = {
  publishedAt?: string | null
  lastReviewedAt?: string | null
}

export function buildComparePageMeta(
  toolNames: string[],
  slug: string,
  timestamps: CompareMetaTimestamps = {},
) {
  const titlePrefix = toolNames.join(' vs ')
  // Phase 9 (2026-06-04) CTR rewrite: editorial compares rank well (pos 7-8) but
  // earned ~0 clicks — the old title ("Side-by-Side Comparison") and the jargon
  // description ("feature deltas, integration coverage") didn't win the click.
  // Lead with the question searchers ask + an answer-first, benefit-driven
  // snippet. (Per-page title_overrides still win where present.)
  const title = `${titlePrefix}: Which Should You Pick in 2026?`
  const desc = `${titlePrefix} compared on pricing, key features, and real user sentiment — with a clear, independent verdict to help you decide which to pick in 2026.`
  const modified = toIso(timestamps.lastReviewedAt) ?? toIso(timestamps.publishedAt)
  const published = toIso(timestamps.publishedAt)
  return {
    title,
    description: desc.slice(0, 200),
    openGraph: {
      title: `${titlePrefix} — ${SITE}`,
      description: desc.slice(0, 200),
      url: `https://rightaichoice.com/compare/${slug}`,
      type: 'article' as const,
      siteName: SITE,
      ...(published && { publishedTime: published }),
      ...(modified && { modifiedTime: modified }),
      authors: [`${SITE} Editorial`],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: `${titlePrefix} — ${SITE}`,
      description: desc.slice(0, 200),
    },
    alternates: {
      canonical: `https://rightaichoice.com/compare/${slug}`,
    },
    ...(modified && { other: { 'article:modified_time': modified } }),
  }
}

export function buildReportPageMeta(toolName: string, slug: string) {
  const title = `${toolName} Report — Independent Verdict & Sentiment`
  const desc = `Independent ${toolName} report: 5 pros, 5 cons, market sentiment, pricing breakdown, the closest alternatives, and a buyer-first verdict from ${SITE}.`
  return {
    title,
    description: desc.slice(0, 200),
    alternates: {
      canonical: `https://rightaichoice.com/tools/${slug}/report`,
    },
  }
}

export function buildCategoryPageMeta(
  categoryName: string,
  slug: string,
  page: number,
  description?: string | null
) {
  const baseTitle = `Best ${categoryName} AI Tools in 2026`
  const title = page > 1 ? `${baseTitle} (Page ${page})` : baseTitle
  const desc =
    description?.trim() ??
    `Find and compare the best ${categoryName} AI tools for 2026. Independent reviews, real pricing, real ratings, side-by-side alternatives.`
  const canonicalPath = page > 1 ? `/categories/${slug}?page=${page}` : `/categories/${slug}`
  return {
    title,
    description: desc.slice(0, 200),
    alternates: {
      canonical: `https://rightaichoice.com${canonicalPath}`,
    },
  }
}
