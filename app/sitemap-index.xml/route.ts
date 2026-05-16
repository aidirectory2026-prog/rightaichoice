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

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export async function GET() {
  const lastmod = new Date().toISOString()
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAPS.map(
    (path) => `  <sitemap>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`,
  ).join('\n')}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
