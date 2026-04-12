import type { ScrapeResult, ScrapedPost } from './types'

const REDDIT_SEARCH_URL = 'https://www.reddit.com/search.json'

const TARGET_SUBREDDITS = [
  'SaaS', 'startups', 'Entrepreneur', 'artificial', 'productivity',
  'smallbusiness', 'webdev', 'design', 'marketing', 'datascience',
]

/**
 * Scrape Reddit for mentions of a tool.
 * Uses Reddit's public JSON API (no auth needed).
 */
export async function scrapeReddit(toolName: string): Promise<ScrapeResult> {
  const posts: ScrapedPost[] = []

  try {
    // Search across all of Reddit
    const query = encodeURIComponent(`"${toolName}"`)
    const url = `${REDDIT_SEARCH_URL}?q=${query}&sort=relevance&limit=25&t=year`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RightAIChoice/1.0 (tool research bot)',
      },
    })

    if (!res.ok) {
      return { source: 'reddit', posts: [], error: `HTTP ${res.status}`, scrapedAt: new Date().toISOString() }
    }

    const data = await res.json()
    const children = data?.data?.children ?? []

    for (const child of children) {
      const post = child.data
      if (!post?.selftext && !post?.title) continue

      posts.push({
        source: 'reddit',
        title: post.title ?? '',
        body: (post.selftext ?? '').slice(0, 1500),
        author: post.author,
        date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
        score: post.score,
        url: post.permalink ? `https://reddit.com${post.permalink}` : undefined,
      })
    }

    // Also search in target subreddits — run in parallel
    const subResults = await Promise.all(
      TARGET_SUBREDDITS.slice(0, 3).map(async (sub) => {
        try {
          const subUrl = `https://www.reddit.com/r/${sub}/search.json?q=${query}&restrict_sr=on&sort=relevance&limit=5&t=year`
          const subRes = await fetch(subUrl, {
            headers: { 'User-Agent': 'RightAIChoice/1.0 (tool research bot)' },
          })
          if (!subRes.ok) return []
          const subData = await subRes.json()
          return (subData?.data?.children ?? []) as Array<{ data: { selftext?: string; title?: string; author?: string; created_utc?: number; score?: number; permalink?: string } }>
        } catch {
          return []
        }
      })
    )

    for (const children of subResults) {
      for (const child of children) {
        const post = child.data
        if (!post?.selftext && !post?.title) continue
        const url = post.permalink ? `https://reddit.com${post.permalink}` : undefined
        if (url && posts.some((p) => p.url === url)) continue

        posts.push({
          source: 'reddit',
          title: post.title ?? '',
          body: (post.selftext ?? '').slice(0, 1500),
          author: post.author,
          date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
          score: post.score,
          url,
        })
      }
    }

    return {
      source: 'reddit',
      posts: posts.slice(0, 30),
      scrapedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      source: 'reddit',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
