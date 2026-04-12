import type { ScrapeResult, ScrapedPost } from './types'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN

const ACTOR_ID = 'sovereigntaylor/twitter-scraper'

/**
 * Scrape X/Twitter for mentions of a tool using Apify actor.
 */
export async function scrapeTwitter(toolName: string): Promise<ScrapeResult> {
  if (!APIFY_TOKEN) {
    return { source: 'twitter', posts: [], error: 'No Apify API token configured', scrapedAt: new Date().toISOString() }
  }

  try {
    // Start the actor run and wait for it to finish
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/runs?token=${APIFY_TOKEN}&waitForFinish=45`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerms: [`"${toolName}" review OR experience OR alternative`],
          maxTweets: 20,
          includeReplies: false,
          scrapeProfile: false,
          includeMedia: false,
          tweetLanguage: 'en',
          proxyConfiguration: { useApifyProxy: true },
        }),
      }
    )

    if (!runRes.ok) {
      return { source: 'twitter', posts: [], error: `Apify HTTP ${runRes.status}`, scrapedAt: new Date().toISOString() }
    }

    const run = await runRes.json()
    const datasetId = run?.data?.defaultDatasetId

    if (!datasetId) {
      return { source: 'twitter', posts: [], error: 'No dataset returned', scrapedAt: new Date().toISOString() }
    }

    // Fetch results from dataset
    const dataRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=20`
    )

    if (!dataRes.ok) {
      return { source: 'twitter', posts: [], error: `Dataset fetch failed: ${dataRes.status}`, scrapedAt: new Date().toISOString() }
    }

    const items: Record<string, unknown>[] = await dataRes.json()

    const posts: ScrapedPost[] = items.map((item) => ({
      source: 'twitter' as const,
      body: (String(item.text || item.full_text || item.tweet || '')).slice(0, 1500),
      author: String(item.username || item.user || item.handle || ''),
      date: item.created_at ? String(item.created_at) : undefined,
      score: Number(item.likes || item.favorite_count || 0),
      url: item.url ? String(item.url) : undefined,
    })).filter((p) => p.body.length > 10)

    return {
      source: 'twitter',
      posts,
      scrapedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      source: 'twitter',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
