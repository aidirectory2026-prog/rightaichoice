import type { ScrapeResult, ScrapedPost } from './types'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN

const ACTOR_ID = 'crawlerbros/quora-search-scraper'

/**
 * Scrape Quora for Q&A about a tool using Apify actor.
 */
export async function scrapeQuora(toolName: string): Promise<ScrapeResult> {
  if (!APIFY_TOKEN) {
    return { source: 'quora', posts: [], error: 'No Apify API token configured', scrapedAt: new Date().toISOString() }
  }

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/runs?token=${APIFY_TOKEN}&waitForFinish=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQueries: [
            `${toolName} review`,
            `${toolName} alternative experience`,
          ],
          maxResults: 10,
          proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
        }),
      }
    )

    if (!runRes.ok) {
      return { source: 'quora', posts: [], error: `Apify HTTP ${runRes.status}`, scrapedAt: new Date().toISOString() }
    }

    const run = await runRes.json()
    const datasetId = run?.data?.defaultDatasetId

    if (!datasetId) {
      return { source: 'quora', posts: [], error: 'No dataset returned', scrapedAt: new Date().toISOString() }
    }

    const dataRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=15`
    )

    if (!dataRes.ok) {
      return { source: 'quora', posts: [], error: `Dataset fetch failed: ${dataRes.status}`, scrapedAt: new Date().toISOString() }
    }

    const items: Record<string, unknown>[] = await dataRes.json()

    const posts: ScrapedPost[] = items.map((item) => ({
      source: 'quora' as const,
      title: String(item.question || item.title || ''),
      body: (String(item.answer || item.text || item.content || '')).slice(0, 1500),
      author: String(item.author || item.authorName || ''),
      score: Number(item.upvotes || item.upvoteCount || 0),
      url: item.url ? String(item.url) : undefined,
    })).filter((p) => p.body.length > 20)

    return {
      source: 'quora',
      posts,
      scrapedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      source: 'quora',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
