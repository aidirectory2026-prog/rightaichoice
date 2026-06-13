import type { ScrapeResult, ScrapedPost } from './types'

// Fable-5 review (2026-06-13): Stack Overflow via the official Stack Exchange
// API — free, works keyless (300 req/day/IP), optional STACKEXCHANGE_KEY
// raises the quota to 10k/day. Developers' real problems, workarounds and
// praise — the strongest free substitute for the Q&A intent Quora would have
// covered (Quora has no API and hard-blocks scraping).

const SEARCH = 'https://api.stackexchange.com/2.3/search/excerpts'

type SeItem = {
  title?: string
  excerpt?: string
  score?: number
  answer_count?: number
  is_answered?: boolean
  question_id?: number
  creation_date?: number
  item_type?: string
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/**
 * Search Stack Overflow for questions/answers mentioning a tool. Never throws.
 */
export async function scrapeStackOverflow(toolName: string): Promise<ScrapeResult> {
  try {
    const url = new URL(SEARCH)
    // ' ai' guard: generic tool names (Cursor, Notion) otherwise match
    // unrelated dev questions ("stop EditText cursor focus…"). AI-tool
    // questions reliably mention ai/llm/copilot somewhere in title+body.
    url.searchParams.set('q', `"${toolName}" ai`)
    url.searchParams.set('site', 'stackoverflow')
    url.searchParams.set('sort', 'relevance')
    url.searchParams.set('order', 'desc')
    url.searchParams.set('pagesize', '15')
    const key = process.env.STACKEXCHANGE_KEY
    if (key) url.searchParams.set('key', key)

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'RightAIChoice/1.0 (rightaichoice.com)' },
    })
    if (!res.ok) {
      return { source: 'stackoverflow', posts: [], error: `HTTP ${res.status}`, scrapedAt: new Date().toISOString() }
    }
    const json = (await res.json()) as { items?: SeItem[]; quota_remaining?: number }

    const posts: ScrapedPost[] = (json.items ?? [])
      .map((it) => ({
        source: 'stackoverflow' as const,
        title: decodeEntities(it.title ?? ''),
        body: decodeEntities(it.excerpt ?? '').slice(0, 1500),
        score: it.score,
        date: it.creation_date ? new Date(it.creation_date * 1000).toISOString() : undefined,
        url: it.question_id ? `https://stackoverflow.com/q/${it.question_id}` : undefined,
        sentiment: it.is_answered ? 'answered' : undefined,
      }))
      .filter((p) => p.body.length > 20 || (p.title?.length ?? 0) > 10)

    return { source: 'stackoverflow', posts, scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'stackoverflow',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
