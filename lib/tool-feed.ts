/**
 * Step 40 Slice 4 — parse a tool's changelog_url feed (RSS 2.0 or Atom) into
 * a small, typed list for the product page "Recent changes" section.
 *
 * Zero dependencies: deliberately regex-based so we don't pull in a full XML
 * parser. Feed shapes vary wildly; we only need title / url / date from the
 * most recent N entries. Any parse failure returns [] — the UI just hides
 * the section, which is safer than surfacing garbage.
 */

export interface FeedItem {
  title: string
  url: string
  date: string | null
}

const FEED_TIMEOUT_MS = 5000

export async function fetchToolFeed(feedUrl: string, limit = 5): Promise<FeedItem[]> {
  if (!feedUrl) return []
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS)
  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const xml = await res.text()
    return parseFeed(xml, limit)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

function parseFeed(xml: string, limit: number): FeedItem[] {
  const isAtom = /<feed[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml)
  const blockTag = isAtom ? 'entry' : 'item'
  const blockRegex = new RegExp(`<${blockTag}\\b[\\s\\S]*?</${blockTag}>`, 'gi')
  const blocks = xml.match(blockRegex) ?? []
  const out: FeedItem[] = []
  for (const block of blocks) {
    const title = clean(extract(block, 'title'))
    const url = isAtom
      ? extractAttr(block, 'link', 'href') || extract(block, 'id')
      : extract(block, 'link') || extract(block, 'guid')
    const rawDate = isAtom
      ? extract(block, 'updated') || extract(block, 'published')
      : extract(block, 'pubDate') || extract(block, 'dc:date')
    if (!title || !url) continue
    out.push({ title, url: url.trim(), date: parseDate(rawDate) })
    if (out.length >= limit) break
  }
  return out
}

function extract(block: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = block.match(re)
  return m?.[1]?.trim() ?? ''
}

function extractAttr(block: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}\\s*=\\s*"([^"]+)"`, 'i')
  const m = block.match(re)
  return m?.[1]?.trim() ?? ''
}

function clean(value: string): string {
  if (!value) return ''
  let v = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  v = v.replace(/<[^>]+>/g, ' ')
  v = v.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
  return v.replace(/\s+/g, ' ').trim()
}

function parseDate(raw: string): string | null {
  if (!raw) return null
  const d = new Date(raw.trim())
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
