import type { ScrapeResult, ScrapedPost } from './types'
import { fetchNewsMentions } from '@/lib/cron/scrape-news'

// Phase 12 Bug-3.1 (2026-06-23) — tech-press as a sentiment source, FREE.
// Reuses the curated RSS allowlist (TechCrunch, The Verge, Wired, VentureBeat,
// Ars Technica, The Decoder) the freshness pipeline already pulls. Adds a
// recognizable, credible signal to the report — exactly the kind of provenance a
// buyer trusts — at zero cost (no API keys, no per-call charge). Never throws.
export async function scrapeNews(toolName: string): Promise<ScrapeResult> {
  try {
    const items = await fetchNewsMentions(toolName, 8)
    const posts: ScrapedPost[] = items.map((it) => ({
      source: 'news',
      title: it.title,
      body: (it.description || it.title).slice(0, 1500),
      author: it.domain, // the outlet (techcrunch.com, theverge.com, …)
      date: it.date ?? undefined,
      url: it.url,
    }))
    return { source: 'news', posts, scrapedAt: new Date().toISOString() }
  } catch (err) {
    return { source: 'news', posts: [], error: err instanceof Error ? err.message : 'error', scrapedAt: new Date().toISOString() }
  }
}
