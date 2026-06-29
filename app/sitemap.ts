import type { MetadataRoute } from 'next'
import { getSectionFreshness } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

// Phase 7I (2026-05-16): /sitemap.xml is now the STATIC-ONLY sitemap.
// Per-type sitemaps live in nested route segments:
//   /tools/sitemap.xml      — all tool detail pages (1,176)
//   /compare/sitemap.xml    — editorial compare pages + paged hub
//   /categories/sitemap.xml — category landing pages
//   /best/sitemap.xml       — best-of pages
//   /stacks/sitemap.xml     — stack pages
//   /for/sitemap.xml        — role pages
//   /blog/sitemap.xml       — blog posts
// All listed in /sitemap-index.xml (the URL submitted to GSC + Bing).
//
// Why split: monolithic sitemap with 1,800+ URLs collapsed all per-type
// crawl signals together. Per-type sitemaps let Google report indexation
// stats per content category, and let us push freshness signals at the
// per-type level (e.g. tool pages refresh weekly, blog monthly).
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Each section-index URL's <lastmod> = the freshest content inside it
  // (from pages_freshness). NEVER `new Date()` — a hub that claims it changed
  // on every crawl is the fastest way to get our <lastmod> ignored. Truly
  // static editorial pages omit lastmod entirely (honest: Google then uses
  // its own crawl cadence). Empty until backfill:freshness has run.
  const sf = await getSectionFreshness()
  const newest = (...types: Array<Parameters<typeof sf.get>[0]>): Date | undefined => {
    let best: Date | undefined
    for (const t of types) {
      const d = sf.get(t)
      if (d && (!best || d > best)) best = d
    }
    return best
  }
  const lm = (d: Date | undefined) => (d ? { lastModified: d } : {})

  // Homepage reflects the whole catalog's freshest signal.
  const homepageFresh = newest('tool', 'compare', 'blog', 'category', 'best', 'stack', 'role')

  return [
    { url: BASE_URL, ...lm(homepageFresh), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/tools`, ...lm(sf.get('tool')), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/compare`, ...lm(sf.get('compare')), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, ...lm(sf.get('category')), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/best`, ...lm(sf.get('best')), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/stacks`, ...lm(sf.get('stack')), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/for`, ...lm(sf.get('role')), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, ...lm(sf.get('blog')), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/recommend`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/ai-chat`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/viability`, ...lm(sf.get('tool')), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/viability/at-risk`, ...lm(sf.get('tool')), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/viability/safe-bets`, ...lm(sf.get('tool')), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/state-of-ai-tools`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/methodology`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/team`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/embed`, changeFrequency: 'monthly', priority: 0.55 },
  ]
}
