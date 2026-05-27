/**
 * Phase 9 (2026-05-27) — Reusable GSC URL Inspection diagnostic.
 *
 * USAGE:
 *   npm run gsc:inspect                              # inspects homepage
 *   npm run gsc:inspect -- https://rightaichoice.com/tools/cursor
 *
 * Shows Google's current view of any URL: verdict, coverage state,
 * indexing state, robots state, page fetch state, last crawl time,
 * crawled-as device, user vs Google canonical, sitemaps containing the
 * URL, and the direct GSC console link.
 *
 * Caught the "Duplicate without user-selected canonical" homepage
 * bug on first run (2026-05-27); useful for any future canonical
 * or coverage audit.
 */
import { inspectUrl } from '../lib/seo/gsc-client'

async function main() {
  const site = process.env.GSC_SITE_URL ?? 'sc-domain:rightaichoice.com'
  const url = process.argv[2] ?? 'https://rightaichoice.com/'
  console.log(`Inspecting ${url} via ${site}\n`)
  const r = await inspectUrl(site, url)
  const idx = r.inspectionResult.indexStatusResult ?? {}
  console.log('Verdict:           ', idx.verdict)
  console.log('Coverage state:    ', idx.coverageState)
  console.log('Indexing state:    ', idx.indexingState)
  console.log('Robots.txt state:  ', idx.robotsTxtState)
  console.log('Page fetch state:  ', idx.pageFetchState)
  console.log('Last crawl time:   ', idx.lastCrawlTime)
  console.log('Crawled as:        ', idx.crawledAs)
  console.log('User canonical:    ', idx.userCanonical)
  console.log('Google canonical:  ', idx.googleCanonical)
  console.log('Sitemaps:          ', (idx.sitemap ?? []).join(', ') || '(none)')
  console.log('Console link:      ', r.inspectionResult.inspectionResultLink)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
