/**
 * All sentiment sources. Phase 9 S1b rebuilt the mix on free + cheap sources:
 * reddit (OAuth), hn (free), youtube (free key), producthunt (free token),
 * appstore (free iTunes RSS), and g2/trustpilot/google-reviews via DataForSEO
 * (cheap pay-as-you-go). The legacy Apify sources (twitter/quora) are retained
 * in the union for back-compat but no longer scraped.
 */
export type SentimentSource =
  | 'reddit'
  | 'hn'
  | 'youtube'
  | 'producthunt'
  | 'appstore'
  | 'g2'
  | 'trustpilot'
  | 'google'
  | 'twitter'
  | 'quora'

/** Standardized scraped post/review from any source */
export type ScrapedPost = {
  source: SentimentSource
  title?: string
  body: string
  author?: string
  date?: string
  score?: number        // upvotes, likes, helpfulness
  url?: string
  sentiment?: string    // optional pre-tag from source (e.g., G2 pros/cons)
}

/** Result from a single scraper */
export type ScrapeResult = {
  source: SentimentSource
  posts: ScrapedPost[]
  error?: string
  scrapedAt: string
}
