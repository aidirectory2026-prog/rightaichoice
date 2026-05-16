import type { MetadataRoute } from 'next'

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
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/tools`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/compare`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/categories`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/best`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/stacks`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/for`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/recommend`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/ai-chat`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/viability`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${BASE_URL}/viability/at-risk`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/viability/safe-bets`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/methodology`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/team`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/embed`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.55 },
  ]
}
