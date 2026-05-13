/**
 * Phase 8.next Stage 4 / Tier 2 (2026-05-13): news mentions via Apify Google Search.
 *
 * Searches `"{tool name}" 2026 site:({tech-press domains})` via the
 * Apify Google Search Scraper actor and returns the top organic
 * results. Limits to a curated allowlist of credible AI/tech press
 * domains so we don't surface low-quality SEO spam.
 *
 * Cost: actor base + ~$0.0025 per result row. We request 10 results
 * per query → ~$0.025 per tool. Across the 1,178-tool catalog ≈ $30
 * one-time backfill.
 */
import { runActorAndCollect } from '@/lib/seo/apify-client'

const ACTOR_ID = 'apify/google-search-scraper'

// Curated allowlist of credible AI/tech press domains. Filtering by
// site: in the query string is more reliable than post-filtering by
// hostname because Google sometimes returns redirector URLs.
const PRESS_DOMAINS = [
  'techcrunch.com',
  'theverge.com',
  'arstechnica.com',
  'wired.com',
  'venturebeat.com',
  'theinformation.com',
  'thenextweb.com',
  'fastcompany.com',
  'businessinsider.com',
  'bloomberg.com',
  'cnbc.com',
  'forbes.com',
  'thedecoder.com',
]

export type NewsMention = {
  title: string
  url: string
  domain: string
  description: string
  date: string | null // ISO date if Google's snippet exposes one
}

type GoogleSearchResult = {
  title?: string
  url?: string
  description?: string
  emphasizedKeywords?: string[]
  date?: string
  // Apify Google Search Scraper output shape varies by actor version
  // — read permissively below.
  [k: string]: unknown
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Fetch news mentions for a tool. Returns up to `limit` items from the
 * curated press allowlist, sorted by Google's rank (no re-sort).
 *
 * Skips silently if APIFY_TOKEN missing — caller decides what to do.
 */
export async function fetchNewsMentions(
  toolName: string,
  limit = 10,
  opts: { lookbackDays?: number } = {}
): Promise<NewsMention[]> {
  if (!process.env.APIFY_TOKEN) {
    console.warn('[scrape-news] APIFY_TOKEN missing; skipping')
    return []
  }
  const lookbackDays = opts.lookbackDays ?? 90
  // Build query: "tool name" 2026 (site:domain1 OR site:domain2 ...)
  const sites = PRESS_DOMAINS.map((d) => `site:${d}`).join(' OR ')
  const query = `"${toolName}" 2026 (${sites})`

  let items: GoogleSearchResult[]
  try {
    items = await runActorAndCollect<GoogleSearchResult>(
      ACTOR_ID,
      {
        queries: query,
        resultsPerPage: Math.max(10, limit),
        maxPagesPerQuery: 1,
        languageCode: 'en',
        countryCode: 'us',
      },
      { timeoutMs: 5 * 60 * 1000 }
    )
  } catch (err) {
    console.warn(`[scrape-news] actor failed for "${toolName}":`, err instanceof Error ? err.message : err)
    return []
  }

  // The actor returns a top-level result per query plus a nested
  // `organicResults` array. Handle both shapes.
  const flatResults: GoogleSearchResult[] = []
  for (const item of items) {
    if (Array.isArray((item as { organicResults?: GoogleSearchResult[] }).organicResults)) {
      flatResults.push(...((item as { organicResults: GoogleSearchResult[] }).organicResults))
    } else if (item.url && item.title) {
      flatResults.push(item)
    }
  }

  const mentions: NewsMention[] = []
  for (const r of flatResults) {
    if (!r.url || !r.title) continue
    const domain = extractDomain(String(r.url))
    if (!PRESS_DOMAINS.includes(domain)) continue
    mentions.push({
      title: String(r.title).slice(0, 220),
      url: String(r.url),
      domain,
      description: String(r.description ?? '').slice(0, 400),
      date: r.date ? String(r.date) : null,
    })
    if (mentions.length >= limit) break
  }
  // Note: lookbackDays is informational — Google search doesn't strictly
  // enforce date filtering via the actor's input schema. We trust the
  // "2026" in the query to bias toward recent articles.
  void lookbackDays
  return mentions
}
