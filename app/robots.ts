import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/dashboard', '/auth/', '/api/'],
      },
    ],
    // Phase 7I (2026-05-16): point at the sitemap index, not the
    // monolithic sitemap. /sitemap-index.xml lists 8 per-type subsitemaps;
    // the legacy /sitemap.xml is now static-only and one of those entries.
    sitemap: 'https://rightaichoice.com/sitemap-index.xml',
  }
}
