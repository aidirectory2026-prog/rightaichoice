import { searchToolsForAI, type AIToolResult } from '@/lib/data/ai-search'

export type MatchTier = 'keyword' | 'category_fallback' | 'emergency'

/**
 * Per-stage tool search with always-return-something guarantee.
 *
 * Cascade:
 *   1. keyword + category  → tier='keyword'          (ideal: real match)
 *   2. keyword only        → tier='category_fallback' (category yielded 0)
 *   3. intent keywords     → tier='emergency'         (still 0, widened)
 *   4. top-rated catalog   → tier='emergency'         (final safety net)
 *
 * Phase 6 Step 38: the /plan UI never shows "no matches" — every stage
 * returns at least one tool so the user always gets a stack to evaluate.
 */
export async function searchStageTools(params: {
  searchQuery: string
  searchCategory?: string
  fallbackKeywords?: string[]
}): Promise<{ results: AIToolResult[]; tier: MatchTier }> {
  // Tier 1: keyword + category. disableFallback so we can detect real hits.
  const tier1 = await searchToolsForAI({
    query: params.searchQuery,
    ...(params.searchCategory ? { category: params.searchCategory } : {}),
    disableFallback: true,
  })
  if (tier1.length > 0) return { results: tier1, tier: 'keyword' }

  // Tier 2: drop the category — maybe the Sonnet-picked slug was too narrow.
  if (params.searchCategory) {
    const tier2 = await searchToolsForAI({
      query: params.searchQuery,
      disableFallback: true,
    })
    if (tier2.length > 0) return { results: tier2, tier: 'category_fallback' }
  }

  // Tier 3: try intent keywords pulled from the original user query.
  if (params.fallbackKeywords?.length) {
    const joined = params.fallbackKeywords.slice(0, 3).join(' ')
    const tier3 = await searchToolsForAI({
      query: joined,
      disableFallback: true,
    })
    if (tier3.length > 0) return { results: tier3, tier: 'emergency' }
  }

  // Tier 4: no keyword match. Return empty so the route never silently
  // surfaces popularity-sorted unrelated tools. Phase 7 Step 50 (BUG-005):
  // the always-something guarantee is now satisfied by the LLM-named
  // recommendedTools resolved in route.ts and "not in catalog yet"
  // placeholders for unresolved names. Triggering the old top-rated catalog
  // fallback here was the root cause of the planner returning Zendesk +
  // Workday for a newsletter prompt.
  return { results: [], tier: 'emergency' }
}
