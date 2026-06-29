/**
 * BUG-06 (Phase 13) — shared tool-fetch for /best/[slug], kept OUT of the
 * pure-config `best-pages.ts` so importing the config never pulls the
 * server-only Supabase client into a client bundle.
 *
 * Wrapped in React `cache()` so generateMetadata, the page render, and the
 * thin-page gate all share ONE query within a request (no duplicate fetch).
 */
import { cache } from 'react'
import { getTools } from './tools'
import type { BestPageConfig } from './best-pages'

/** The ranked tools shown on a /best/[slug] page (top 18). */
export const getBestPageTools = cache(async (config: BestPageConfig) => {
  const filters: Parameters<typeof getTools>[0] = { page: 1, sort: 'most_reviewed' }
  if (config.skillLevel) filters.skill_level = config.skillLevel
  if (config.slug === 'free') filters.pricing = 'free'
  // Niche pages populate via full-text relevance; the rest via category.
  if (config.niche) {
    filters.search = config.niche
    filters.rankByRelevance = true
  } else {
    const category = config.categories?.[0]
    if (category) filters.category = category
  }
  const { tools } = await getTools(filters)
  return tools.slice(0, 18)
})
