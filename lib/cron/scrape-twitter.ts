/**
 * Phase 8.next Stage 4 / Tier 2 (2026-05-13): Twitter/X scraping via Apify.
 *
 * Two query modes per tool:
 *   1. If we have `tools.twitter_handle` cached, use `from:{handle}` to
 *      get vendor's own announcements (highest signal).
 *   2. Else fall back to `"{tool name}"` keyword search across all of X.
 *
 * Returns top tweets by engagement (likes + retweets), filtered to
 * last `lookbackDays`. Uses Apify Twitter scraper (no API costs).
 *
 * Vendor handle discovery is cheap heuristic: try `@{slug}` first,
 * then scrape `<a rel="me" href="twitter.com/...">` from vendor
 * homepage if the handle attempt yields zero results.
 */
import { runActorAndCollect } from '@/lib/seo/apify-client'
import { fetchHTML } from './scrape'

// Several Twitter scraper actors exist on Apify with similar IO shapes.
// `apidojo/twitter-scraper-lite` is among the cheaper + reliable ones.
// If it goes down, swap to `quacker/twitter-scraper` with same input.
const ACTOR_ID = 'apidojo/twitter-scraper-lite'

export type Tweet = {
  text: string
  url: string
  author: string
  date: string
  likes: number
  retweets: number
}

type TwitterApifyItem = {
  text?: string
  full_text?: string
  url?: string
  twitterUrl?: string
  user?: { screen_name?: string; userName?: string }
  author?: string
  created_at?: string
  date?: string
  favorite_count?: number
  likeCount?: number
  retweet_count?: number
  retweetCount?: number
  [k: string]: unknown
}

/**
 * Heuristic discovery: try `https://twitter.com/{slug}` first, then
 * scrape vendor homepage for `rel="me"` links to twitter.com.
 * Returns the handle (no @ prefix) or null.
 */
export async function discoverTwitterHandle(
  slug: string,
  websiteUrl: string | null | undefined
): Promise<string | null> {
  // Try the slug as-is — works for ChatGPT (`@chatgptapp` ish), Cursor (`@cursor_ai`), etc.
  // We don't actually verify via API (no cost-free way); we just trust the heuristic
  // and let the downstream Twitter search return empty if the handle is wrong.
  // For higher-confidence handles, the homepage scrape below is the better path.
  if (!websiteUrl) return slug // best-effort fallback
  try {
    const html = await fetchHTML(websiteUrl, 5_000).catch(() => '')
    if (!html) return slug
    const match = html.match(/<a[^>]+href=["']?https?:\/\/(?:twitter|x)\.com\/([\w_]{2,30})/i)
    if (match && match[1]) return match[1].toLowerCase()
  } catch {
    // ignore; fall through
  }
  return slug
}

/**
 * Fetch top tweets about a tool from Apify. Returns up to `limit` items.
 * Skips silently if APIFY_TOKEN missing.
 */
export async function fetchTweets(
  toolName: string,
  twitterHandle: string | null,
  limit = 5,
  lookbackDays = 30
): Promise<Tweet[]> {
  if (!process.env.APIFY_TOKEN) {
    console.warn('[scrape-twitter] APIFY_TOKEN missing; skipping')
    return []
  }
  const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
  const searchTerms: string[] = []
  if (twitterHandle) searchTerms.push(`from:${twitterHandle} since:${cutoffDate}`)
  searchTerms.push(`"${toolName}" since:${cutoffDate}`)

  let items: TwitterApifyItem[]
  try {
    items = await runActorAndCollect<TwitterApifyItem>(
      ACTOR_ID,
      {
        searchTerms,
        maxItems: limit * 3, // overfetch — many tweets are noise; we filter below
        sort: 'Top',
        tweetLanguage: 'en',
      },
      { timeoutMs: 5 * 60 * 1000 }
    )
  } catch (err) {
    console.warn(`[scrape-twitter] actor failed for "${toolName}":`, err instanceof Error ? err.message : err)
    return []
  }

  const tweets: Tweet[] = []
  for (const t of items) {
    const text = String(t.text ?? t.full_text ?? '').trim()
    if (!text || text.length < 20) continue
    const url = String(t.url ?? t.twitterUrl ?? '')
    if (!url) continue
    const author =
      String(t.user?.screen_name ?? t.user?.userName ?? t.author ?? '').replace(/^@/, '')
    const date = String(t.created_at ?? t.date ?? '')
    const likes = Number(t.favorite_count ?? t.likeCount ?? 0) || 0
    const retweets = Number(t.retweet_count ?? t.retweetCount ?? 0) || 0
    tweets.push({ text: text.slice(0, 280), url, author, date, likes, retweets })
  }
  // Sort by engagement (likes + 2 × retweets) and take top N
  tweets.sort((a, b) => b.likes + 2 * b.retweets - (a.likes + 2 * a.retweets))
  return tweets.slice(0, limit)
}
