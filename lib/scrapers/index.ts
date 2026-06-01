import { scrapeReddit } from './reddit'
import { scrapeHN } from './hn'
import { scrapeYouTube } from './youtube'
import { scrapeProductHunt } from './producthunt'
import { scrapeAppStore } from './appstore'
import { scrapeTrustpilot } from './dataforseo'
import type { ScrapeResult, SentimentSource } from './types'

export type { ScrapeResult, ScrapedPost, SentimentSource } from './types'

// Phase 9 S1b (2026-06-01): the source mix is now Reddit (OAuth) + Hacker News
// + YouTube + Product Hunt + App Store + Trustpilot (DataForSEO). The legacy
// Apify sources (twitter/quora/g2) were retired — the account hard-limited and
// they cost more per scan than the feature charges. Legacy keys are kept on the
// result (always empty) so existing writers (onboard step 9, scrape-sentiment
// cron, report/generate, backfill) that persist raw_twitter/raw_quora/raw_g2
// keep compiling without change.

const EMPTY = (source: SentimentSource): ScrapeResult => ({ source, posts: [], scrapedAt: new Date().toISOString() })

export type AllScrapeResults = {
  reddit: ScrapeResult
  hn: ScrapeResult
  youtube: ScrapeResult
  producthunt: ScrapeResult
  appstore: ScrapeResult
  trustpilot: ScrapeResult
  // legacy (retired) — always empty, retained for back-compat
  twitter: ScrapeResult
  quora: ScrapeResult
  g2: ScrapeResult
  /** every source's result, for iteration (synthesis context, raw storage) */
  all: ScrapeResult[]
  totalPosts: number
  sourcesSucceeded: string[]
  sourcesFailed: string[]
}

/** Race a scraper against a per-source budget; a timeout yields an empty result. */
function withBudget(source: SentimentSource, p: Promise<ScrapeResult>, budgetMs: number): Promise<ScrapeResult> {
  return Promise.race([
    p,
    new Promise<ScrapeResult>((resolve) =>
      setTimeout(() => resolve({ source, posts: [], error: `timeout ${budgetMs}ms`, scrapedAt: new Date().toISOString() }), budgetMs),
    ),
  ]).catch((err) => ({ source, posts: [], error: err instanceof Error ? err.message : 'error', scrapedAt: new Date().toISOString() }))
}

export type ScrapeOptions = {
  /** tool website — needed for Trustpilot domain resolution */
  website?: string | null
  /** per-source time budget (ms). Live scan ~40s; background backfill higher. */
  budgetMs?: number
  /** include the slower task-based review sources (Trustpilot). Default true. */
  includeReviewSites?: boolean
}

/**
 * Scrape every configured source in parallel for a tool. Never throws — each
 * source fails independently into an error-tagged empty result. Sources without
 * credentials (YouTube/Product Hunt/Trustpilot) return empty gracefully.
 */
export async function scrapeAllSources(
  toolName: string,
  options?: ScrapeOptions,
): Promise<AllScrapeResults> {
  const budget = options?.budgetMs ?? 40_000
  const includeReviews = options?.includeReviewSites ?? true

  const [reddit, hn, youtube, producthunt, appstore, trustpilot] = await Promise.all([
    withBudget('reddit', scrapeReddit(toolName), budget),
    withBudget('hn', scrapeHN(toolName), budget),
    withBudget('youtube', scrapeYouTube(toolName), budget),
    withBudget('producthunt', scrapeProductHunt(toolName), budget),
    withBudget('appstore', scrapeAppStore(toolName), budget),
    includeReviews
      ? withBudget('trustpilot', scrapeTrustpilot(toolName, options?.website, Math.min(budget, 30_000)), budget)
      : Promise.resolve(EMPTY('trustpilot')),
  ])

  const results = {
    reddit, hn, youtube, producthunt, appstore, trustpilot,
    twitter: EMPTY('twitter'), quora: EMPTY('quora'), g2: EMPTY('g2'),
  }
  const all = [reddit, hn, youtube, producthunt, appstore, trustpilot]

  const sourcesSucceeded: string[] = []
  const sourcesFailed: string[] = []
  let totalPosts = 0
  for (const r of all) {
    if (r.posts.length > 0) {
      sourcesSucceeded.push(r.source)
      totalPosts += r.posts.length
    } else {
      sourcesFailed.push(r.source)
    }
  }

  return { ...results, all, totalPosts, sourcesSucceeded, sourcesFailed }
}
