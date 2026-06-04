import type { ScrapeResult, ScrapedPost } from './types'

// Phase 9 S1b (2026-06-01): Hacker News via Algolia's free search API
// (no auth, no documented rate limit). We pull both COMMENTS (the actual
// opinions/criticism) and STORIES (launches/benchmarks) mentioning the tool.
// Strong signal for dev/infra/AI tools — i.e. most of the catalog.

const ALGOLIA = 'https://hn.algolia.com/api/v1/search'

type AlgoliaHit = {
  objectID: string
  title?: string
  story_title?: string
  comment_text?: string
  story_text?: string
  url?: string
  story_url?: string
  points?: number
  num_comments?: number
  author?: string
  created_at?: string
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/\s+/g, ' ')
    .trim()
}

async function search(query: string, tags: string, lookbackDays: number): Promise<AlgoliaHit[]> {
  const cutoff = Math.floor((Date.now() - lookbackDays * 86_400_000) / 1000)
  const url = new URL(ALGOLIA)
  url.searchParams.set('query', query)
  url.searchParams.set('tags', tags)
  url.searchParams.set('numericFilters', `created_at_i>${cutoff}`)
  url.searchParams.set('hitsPerPage', '20')
  const res = await fetch(url.toString(), { headers: { 'User-Agent': 'RightAIChoice/1.0' } })
  if (!res.ok) throw new Error(`HN ${res.status}`)
  const json = (await res.json()) as { hits?: AlgoliaHit[] }
  return json.hits ?? []
}

/**
 * Scrape Hacker News for opinions about a tool. Comments first (real opinions),
 * then stories. Never throws.
 */
export async function scrapeHN(toolName: string): Promise<ScrapeResult> {
  try {
    // 18-month lookback — HN discussion is sparser than Reddit, so widen it.
    const [comments, stories] = await Promise.all([
      search(`"${toolName}"`, 'comment', 540).catch(() => [] as AlgoliaHit[]),
      search(`"${toolName}"`, 'story', 540).catch(() => [] as AlgoliaHit[]),
    ])

    const posts: ScrapedPost[] = []

    for (const h of comments) {
      const text = stripHtml(h.comment_text ?? '')
      if (text.length < 30) continue
      posts.push({
        source: 'hn',
        title: h.story_title ?? '',
        body: text.slice(0, 1500),
        author: h.author,
        date: h.created_at,
        score: h.points,
        url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      })
    }

    for (const h of stories) {
      const title = h.title ?? h.story_title ?? ''
      const text = stripHtml(h.story_text ?? '')
      if (!title && !text) continue
      const url = `https://news.ycombinator.com/item?id=${h.objectID}`
      if (posts.some((p) => p.url === url)) continue
      posts.push({
        source: 'hn',
        title,
        body: (text || title).slice(0, 1500),
        author: h.author,
        date: h.created_at,
        score: h.points,
        url,
      })
    }

    return { source: 'hn', posts: posts.slice(0, 30), scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'hn',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
