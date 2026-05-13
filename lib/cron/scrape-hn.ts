/**
 * Phase 8.next Stage 4 / Tier 2 (2026-05-13): Hacker News search.
 *
 * Uses Algolia's free HN search API (no auth, no rate limit documented).
 * Returns top stories matching the tool name in the last 30 days,
 * sorted by relevance × score.
 *
 * Strong signal for dev-tool launches + benchmarks; weaker signal
 * for marketing tools (those tools rarely surface on HN).
 */

const HN_BASE = 'https://hn.algolia.com/api/v1/search'

export type HNStory = {
  title: string
  url: string
  hn_url: string
  points: number
  num_comments: number
  created_at: string // ISO date
  author: string
}

type HnAlgoliaHit = {
  objectID: string
  title?: string
  story_title?: string
  url?: string
  story_url?: string
  points?: number
  num_comments?: number
  created_at?: string
  author?: string
}

/**
 * Search HN for recent stories about a tool. Returns top 5 by HN score.
 * Filter to last 30 days via numericFilters parameter.
 */
export async function searchHN(toolName: string, lookbackDays = 30): Promise<HNStory[]> {
  const cutoff = Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000)
  const url = new URL(HN_BASE)
  url.searchParams.set('query', toolName)
  url.searchParams.set('tags', 'story')
  url.searchParams.set('numericFilters', `created_at_i>${cutoff}`)
  url.searchParams.set('hitsPerPage', '10')

  let json: { hits?: HnAlgoliaHit[] }
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'RightAIChoice (rightaichoice.com)' },
    })
    if (!res.ok) return []
    json = (await res.json()) as { hits?: HnAlgoliaHit[] }
  } catch {
    return []
  }

  const hits = (json.hits ?? []).filter((h) => (h.title || h.story_title) && (h.points ?? 0) >= 5)

  return hits
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    .slice(0, 5)
    .map((h) => ({
      title: (h.title || h.story_title || '').slice(0, 200),
      url: h.url || h.story_url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      hn_url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      points: h.points ?? 0,
      num_comments: h.num_comments ?? 0,
      created_at: h.created_at ?? '',
      author: h.author ?? '',
    }))
}
