import { NextResponse } from 'next/server'

const BASE_URL = 'https://rightaichoice.com'

// Phase 7I (2026-05-16): manual sitemap index. Lists every per-type
// subsitemap so search engines can fetch them in parallel and report
// per-type indexation stats. Submit THIS URL to GSC + Bing Webmaster
// (not /sitemap.xml — which is now static-only).
//
// Next.js's metadata convention does not auto-generate a sitemap index
// when multiple sitemap.ts files exist in nested route segments, so we
// build one ourselves as a Route Handler.

const SITEMAPS = [
  '/sitemap.xml',
  '/tools/sitemap.xml',
  '/compare/sitemap.xml',
  '/categories/sitemap.xml',
  '/best/sitemap.xml',
  '/stacks/sitemap.xml',
  '/for/sitemap.xml',
  '/blog/sitemap.xml',
]

// Static content (8 fixed sub-sitemap URLs). It was `force-dynamic`, so it was
// re-rendered on every request and rarely warm — a cold start spiked it to ~10s,
// which exceeded Bing's sitemap-fetch tolerance and left the index "Pending" (so
// Bing never followed it to the per-type sitemaps). No dynamic data here, so we
// let it be cached and set a long CDN TTL with stale-while-revalidate: the CDN
// always serves an instant copy and a cold start can never block a crawler.
export const revalidate = 86400

export function GET() {
  // Date-free lastmod (a fixed build-stamp would be misleading and per-request
  // `new Date()` would defeat caching); per-type sitemaps carry real lastmods.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAPS.map(
    (path) => `  <sitemap>
    <loc>${BASE_URL}${path}</loc>
  </sitemap>`,
  ).join('\n')}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
