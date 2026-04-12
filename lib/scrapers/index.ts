import { scrapeReddit } from './reddit'
import { scrapeTwitter } from './twitter'
import { scrapeQuora } from './quora'
import { scrapeG2 } from './g2'
import type { ScrapeResult } from './types'

export type { ScrapeResult, ScrapedPost } from './types'

export type AllScrapeResults = {
  reddit: ScrapeResult
  twitter: ScrapeResult
  quora: ScrapeResult
  g2: ScrapeResult
  totalPosts: number
  sourcesSucceeded: string[]
  sourcesFailed: string[]
}

/**
 * Scrape all 4 sources in parallel for a given tool.
 * Never throws — individual source failures are captured in the result.
 */
export async function scrapeAllSources(
  toolName: string,
  options?: { g2Slug?: string }
): Promise<AllScrapeResults> {
  const [reddit, twitter, quora, g2] = await Promise.all([
    scrapeReddit(toolName),
    scrapeTwitter(toolName),
    scrapeQuora(toolName),
    scrapeG2(toolName, options?.g2Slug),
  ])

  const results = { reddit, twitter, quora, g2 }

  const sourcesSucceeded: string[] = []
  const sourcesFailed: string[] = []
  let totalPosts = 0

  for (const [key, result] of Object.entries(results)) {
    if (result.posts.length > 0) {
      sourcesSucceeded.push(key)
      totalPosts += result.posts.length
    } else {
      sourcesFailed.push(key)
    }
  }

  return {
    ...results,
    totalPosts,
    sourcesSucceeded,
    sourcesFailed,
  }
}
