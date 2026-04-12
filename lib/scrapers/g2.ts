import type { ScrapeResult, ScrapedPost } from './types'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN

const ACTOR_ID = 'focused_vanguard/g2-reviews-scraper'

/**
 * Scrape G2 reviews for a tool using Apify actor.
 * Requires the G2 product URL slug (we try to guess it from tool name).
 */
export async function scrapeG2(toolName: string, g2Slug?: string): Promise<ScrapeResult> {
  if (!APIFY_TOKEN) {
    return { source: 'g2', posts: [], error: 'No Apify API token configured', scrapedAt: new Date().toISOString() }
  }

  // Build G2 URL — try the slug or derive from tool name
  const slug = g2Slug || toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const g2Url = `https://www.g2.com/products/${slug}/reviews`

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/runs?token=${APIFY_TOKEN}&waitForFinish=120`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: g2Url,
          maxReviews: 20,
          maxPages: 2,
          lookbackDays: 365,
        }),
      }
    )

    if (!runRes.ok) {
      return { source: 'g2', posts: [], error: `Apify HTTP ${runRes.status}`, scrapedAt: new Date().toISOString() }
    }

    const run = await runRes.json()
    const datasetId = run?.data?.defaultDatasetId

    if (!datasetId) {
      return { source: 'g2', posts: [], error: 'No dataset returned', scrapedAt: new Date().toISOString() }
    }

    const dataRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=20`
    )

    if (!dataRes.ok) {
      return { source: 'g2', posts: [], error: `Dataset fetch failed: ${dataRes.status}`, scrapedAt: new Date().toISOString() }
    }

    const items: Record<string, unknown>[] = await dataRes.json()

    const posts: ScrapedPost[] = items.map((item) => {
      const pros = String(item.pros || item.whatDoYouLikeBest || '')
      const cons = String(item.cons || item.whatDoYouDislike || '')
      const review = String(item.review || item.text || item.comment || '')
      const body = [
        pros ? `Pros: ${pros}` : '',
        cons ? `Cons: ${cons}` : '',
        review,
      ].filter(Boolean).join('\n').slice(0, 2000)

      return {
        source: 'g2' as const,
        title: String(item.title || item.headline || ''),
        body,
        author: String(item.reviewer || item.author || item.name || ''),
        date: item.date ? String(item.date) : item.publishDate ? String(item.publishDate) : undefined,
        score: Number(item.rating || item.starRating || item.overallRating || 0),
        url: item.url ? String(item.url) : undefined,
        sentiment: pros && cons ? undefined : undefined,
      }
    }).filter((p) => p.body.length > 20)

    return {
      source: 'g2',
      posts,
      scrapedAt: new Date().toISOString(),
    }
  } catch (err) {
    return {
      source: 'g2',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
