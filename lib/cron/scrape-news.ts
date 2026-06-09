/**
 * Phase 8.next refactor (2026-05-13): free RSS-feed scraping for news mentions.
 *
 * Replaces the Apify Google Search dependency with direct RSS pulls
 * from a curated allowlist of credible AI/tech press outlets. Each
 * RSS feed is fetched once per orchestrator run (cached in-memory
 * for the process lifetime), then we filter items mentioning the
 * tool name (case-insensitive substring match).
 *
 * Trade-off vs. Google: misses anything outside our curated outlets,
 * but quality is higher (no SEO-spam blogs surfacing). For RAC's
 * "freshness signal" use case, that's the right trade.
 */
import { fetchPageText } from './scrape'

export type NewsMention = {
  title: string
  url: string
  domain: string
  description: string
  date: string | null // ISO date when parseable from <pubDate>
}

// Curated AI/tech press RSS feeds. Every URL must return RSS 2.0 or
// Atom XML and update at least daily. If a feed dies, comment it out
// and the rest still work.
const RSS_FEEDS: Array<{ domain: string; url: string }> = [
  { domain: 'techcrunch.com', url: 'https://techcrunch.com/feed/' },
  { domain: 'theverge.com', url: 'https://www.theverge.com/rss/index.xml' },
  { domain: 'wired.com', url: 'https://www.wired.com/feed/rss' },
  { domain: 'venturebeat.com', url: 'https://venturebeat.com/feed/' },
  { domain: 'arstechnica.com', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { domain: 'the-decoder.com', url: 'https://the-decoder.com/feed/' },
]

// Process-lifetime cache so a long-running orchestrator script doesn't
// re-fetch the same RSS feed 1,178 times. Cleared between cron fires
// (each cron route invocation is a fresh process).
let feedCacheTs: number | null = null
let feedCacheItems: NewsMention[] = []
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
}

function stripTags(s: string): string {
  return unescapeHtml(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Parse a single RSS/Atom feed XML and extract items as NewsMention[].
 * Permissive — handles both RSS 2.0 (<item>) and Atom (<entry>) shapes.
 */
function parseFeed(xml: string, domain: string): NewsMention[] {
  const items: NewsMention[] = []
  // Try RSS <item>...</item> first
  const itemRe = /<item[\s\S]*?<\/item>/gi
  let matches = xml.match(itemRe) ?? []
  if (matches.length === 0) {
    // Atom <entry>...</entry>
    const entryRe = /<entry[\s\S]*?<\/entry>/gi
    matches = xml.match(entryRe) ?? []
  }
  for (const block of matches) {
    const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim()
    let link = ''
    // RSS: <link>URL</link>; Atom: <link href="URL"/>
    const rssLink = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim()
    const atomLink = block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1]?.trim()
    link = rssLink || atomLink || ''
    // <description> for RSS, <summary> or <content> for Atom
    const desc =
      block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ??
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ??
      block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ??
      ''
    // <pubDate> for RSS, <published> or <updated> for Atom
    const pubRaw =
      block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ??
      block.match(/<published>([\s\S]*?)<\/published>/i)?.[1] ??
      block.match(/<updated>([\s\S]*?)<\/updated>/i)?.[1] ??
      ''
    let date: string | null = null
    if (pubRaw) {
      const d = new Date(pubRaw.trim())
      if (!Number.isNaN(d.getTime())) date = d.toISOString().slice(0, 10)
    }
    if (!title || !link) continue
    items.push({
      title: stripTags(title).slice(0, 220),
      url: link,
      domain,
      description: stripTags(desc).slice(0, 400),
      date,
    })
  }
  return items
}

/**
 * Refresh the in-process feed cache by pulling all configured RSS
 * feeds in parallel. Cheap (~6 fetches, ~2 sec).
 */
async function refreshFeedCache(): Promise<NewsMention[]> {
  const now = Date.now()
  if (feedCacheTs && now - feedCacheTs < CACHE_TTL_MS && feedCacheItems.length > 0) {
    return feedCacheItems
  }
  const all: NewsMention[] = []
  await Promise.all(
    RSS_FEEDS.map(async ({ domain, url }) => {
      try {
        const xml = await fetchPageText(url, 8000).catch(() => '')
        if (!xml || xml.length < 200) return
        // fetchPageText strips tags by default — we need raw XML. Use raw fetch.
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          },
        })
        if (!res.ok) return
        const rawXml = await res.text()
        const parsed = parseFeed(rawXml, domain)
        all.push(...parsed)
      } catch {
        // ignore feed-level failures; the rest still work
      }
    })
  )
  feedCacheTs = now
  feedCacheItems = all
  return all
}

/**
 * Search the cached feed corpus for items mentioning a tool. Returns
 * top `limit` matches, sorted by date desc.
 *
 * Match rule: case-insensitive substring of `toolName` in title or
 * description. Word-boundary check to avoid noise (e.g., "kit" should
 * match "Kit AI" but not "kitchen").
 */
export async function fetchNewsMentions(
  toolName: string,
  limit = 8,
  _opts: { lookbackDays?: number } = {}
): Promise<NewsMention[]> {
  const allItems = await refreshFeedCache()
  if (allItems.length === 0) return []

  const needle = toolName.toLowerCase().trim()
  if (needle.length < 2) return []
  // Word-boundary regex to reject substring noise.
  // Phase 10 #54 — was double-escaped (`\\$&` produced `\\.` → a literal
  // backslash in the pattern), so any tool name with a "." (Notion.so, v0.dev,
  // Make.com…) could never match. Correct single-backslash regex escape:
  const wbRe = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')

  const matched = allItems.filter((it) => wbRe.test(it.title) || wbRe.test(it.description))
  // Sort by date desc (null last)
  matched.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })
  return matched.slice(0, limit)
}
