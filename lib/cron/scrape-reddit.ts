/**
 * Phase 8.next refactor (2026-05-13): free Reddit search via reddit.com's
 * public JSON endpoint. Replaces the Apify Reddit scraper.
 *
 * Reddit allows ~60 unauthenticated req/min if you set a real
 * User-Agent. JSON shape is the same as the official API; no auth
 * needed for read-only public posts.
 *
 * Each search returns up to 25 results ordered by relevance. We filter
 * to last 30 days client-side, sort by score, take top N.
 */

const REDDIT_BASE = 'https://www.reddit.com'
const UA = 'RightAIChoice/1.0 (https://rightaichoice.com; contact: hello@rightaichoice.com)'

export type RedditPost = {
  title: string
  url: string
  permalink: string // full URL to the reddit thread
  subreddit: string
  score: number
  num_comments: number
  created_utc: number
}

type RedditChild = {
  kind: string
  data: {
    title?: string
    url?: string
    permalink?: string
    subreddit?: string
    score?: number
    num_comments?: number
    created_utc?: number
    is_self?: boolean
    over_18?: boolean
  }
}

type RedditListing = {
  data?: { children?: RedditChild[] }
}

/**
 * Search Reddit for posts mentioning a tool. Returns top N by score
 * within the lookback window.
 */
export async function searchReddit(
  toolName: string,
  limit = 5,
  lookbackDays = 30
): Promise<RedditPost[]> {
  const cutoff = Math.floor((Date.now() - lookbackDays * 24 * 60 * 60 * 1000) / 1000)
  const url = new URL(`${REDDIT_BASE}/search.json`)
  url.searchParams.set('q', `"${toolName}"`)
  url.searchParams.set('sort', 'relevance')
  url.searchParams.set('limit', '25')
  url.searchParams.set('restrict_sr', 'false')
  url.searchParams.set('t', 'month')

  let json: RedditListing
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      // 429 = rate-limited, 503 = Reddit overload — caller falls through to empty
      return []
    }
    json = (await res.json()) as RedditListing
  } catch {
    return []
  }

  const children = json.data?.children ?? []
  const posts: RedditPost[] = []
  for (const c of children) {
    const d = c.data
    if (!d.title || !d.permalink) continue
    if (d.over_18) continue // filter NSFW
    const ts = d.created_utc ?? 0
    if (ts < cutoff) continue // older than lookback window
    if ((d.score ?? 0) < 5) continue // skip low-engagement noise
    posts.push({
      title: d.title.slice(0, 220),
      url: d.url || `${REDDIT_BASE}${d.permalink}`,
      permalink: `${REDDIT_BASE}${d.permalink}`,
      subreddit: d.subreddit ?? '',
      score: d.score ?? 0,
      num_comments: d.num_comments ?? 0,
      created_utc: ts,
    })
  }

  // Top N by score
  posts.sort((a, b) => b.score - a.score)
  return posts.slice(0, limit)
}
