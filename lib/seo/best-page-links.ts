/**
 * Fable-5 review Dept D — internal links INTO the /best guides.
 *
 * GSC diagnosis (2026-06-11): the 64 niche best-pages are indexed (50/51
 * inspections PASS) but invisible — 51/64 get zero impressions and the rest
 * average position 69. Their only internal link is the footer /best hub.
 * This module computes contextual "Featured in our guides" links from the
 * high-authority surfaces (tool pages ×~2,000, category pages) into relevant
 * best pages, purely from the static BEST_PAGES config — no DB cost.
 */

import { BEST_PAGES, type BestPageConfig } from '@/lib/data/best-pages'

export type BestPageLink = { slug: string; label: string }

function indexable(p: BestPageConfig): boolean {
  return !p.noindex
}

function toLink(p: BestPageConfig): BestPageLink {
  return { slug: p.slug, label: p.h1 }
}

/**
 * Best pages relevant to a set of category slugs (category-configured pages
 * whose categories intersect), then niche pages whose niche keyword appears
 * in the supplied free text (tool tagline/description, category name).
 * Returns up to `limit`, category matches first.
 */
export function getRelatedBestPages(opts: {
  categorySlugs?: string[]
  text?: string
  limit?: number
}): BestPageLink[] {
  const limit = opts.limit ?? 6
  const catSet = new Set((opts.categorySlugs ?? []).filter(Boolean))
  const haystack = (opts.text ?? '').toLowerCase()

  const byCategory: BestPageLink[] = []
  const byNiche: BestPageLink[] = []

  for (const p of BEST_PAGES) {
    if (!indexable(p)) continue
    if (p.categories?.some((c) => catSet.has(c))) {
      byCategory.push(toLink(p))
      continue
    }
    if (p.niche && haystack && haystack.includes(p.niche.toLowerCase())) {
      byNiche.push(toLink(p))
    }
  }

  return byCategory.concat(byNiche).slice(0, limit)
}
