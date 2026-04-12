/** Standardized scraped post/review from any source */
export type ScrapedPost = {
  source: 'reddit' | 'twitter' | 'quora' | 'g2'
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
  source: 'reddit' | 'twitter' | 'quora' | 'g2'
  posts: ScrapedPost[]
  error?: string
  scrapedAt: string
}
