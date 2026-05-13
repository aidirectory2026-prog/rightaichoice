/**
 * Phase 8.next Stage 4 / Tier 2 (2026-05-13): vendor changelog discovery + scrape.
 *
 * Tries common changelog/release-notes URL patterns against a tool's
 * vendor origin. First 200 wins. Returns the URL + page text so the
 * caller can both cache the URL on `tools.changelog_url` AND feed the
 * text to DeepSeek synthesis.
 *
 * Hit rate observed in similar directory projects: ~40% of vendors
 * have a discoverable changelog; the rest fall back to blog + news.
 */
import { fetchPageText } from './scrape'

const CHANGELOG_PATHS = [
  '/changelog',
  '/release-notes',
  '/releases',
  '/whats-new',
  '/whats-new/',
  '/updates',
  '/changes',
  '/news/release-notes',
  '/docs/changelog',
  '/docs/release-notes',
]

const BLOG_PATHS = ['/blog', '/blog/', '/news', '/posts']

export type DiscoveredSource = {
  url: string
  text: string
}

function extractOrigin(websiteUrl: string | null | undefined): string | null {
  if (!websiteUrl) return null
  try {
    const url = new URL(websiteUrl)
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

/**
 * Discover the changelog URL for a vendor. Returns the URL + scraped
 * text on first 200, or null if none of the candidate paths return
 * usable content.
 */
export async function discoverChangelog(
  websiteUrl: string | null | undefined,
  cachedUrl?: string | null
): Promise<DiscoveredSource | null> {
  const origin = extractOrigin(websiteUrl)
  if (!origin) return null

  // If a cached URL exists, try that first; on failure, fall through to
  // the heuristic discovery (vendor may have moved the page).
  if (cachedUrl) {
    const text = await fetchPageText(cachedUrl).catch(() => '')
    if (text && text.length >= 200) return { url: cachedUrl, text }
  }

  for (const path of CHANGELOG_PATHS) {
    const url = `${origin}${path}`
    const text = await fetchPageText(url).catch(() => '')
    // Heuristic: real changelog pages have substantive text. Login
    // walls / 404 pages / empty templates return < 200 chars.
    if (text && text.length >= 200) return { url, text }
  }
  return null
}

/**
 * Discover the blog index URL for a vendor. Same pattern as changelog.
 */
export async function discoverBlog(
  websiteUrl: string | null | undefined,
  cachedUrl?: string | null
): Promise<DiscoveredSource | null> {
  const origin = extractOrigin(websiteUrl)
  if (!origin) return null

  if (cachedUrl) {
    const text = await fetchPageText(cachedUrl).catch(() => '')
    if (text && text.length >= 200) return { url: cachedUrl, text }
  }

  for (const path of BLOG_PATHS) {
    const url = `${origin}${path}`
    const text = await fetchPageText(url).catch(() => '')
    if (text && text.length >= 200) return { url, text }
  }
  return null
}
