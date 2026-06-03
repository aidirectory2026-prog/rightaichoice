import type { MetadataRoute } from 'next'
import { getAllComparisonSlugs } from '@/lib/data/comparisons'
import { getLastChangedAtBatch } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

// 2026-06-03: removed `export const dynamic = 'force-dynamic'`. It had been
// added to dodge build-time hangs, but force-dynamic opts the route OUT of
// Next 16's default sitemap caching → every crawler fetch was an uncached
// ~1.6s render (x-vercel-cache: MISS). That's the same failure mode that left
// /tools/sitemap.xml stuck "Pending" in Bing; compare only survived because it
// was still under Bing's fetch tolerance — but it grows every week. The data
// source (getAllComparisonSlugs) already uses the cookie-free admin client, so
// dropping force-dynamic lets Next cache it. revalidate keeps it ≤1h fresh; the
// 180s staticPageGenerationTimeout covers the build-time query (633 rows).
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const comparisons = await getAllComparisonSlugs()

  // Overlay the freshness cascade over each compare's real review/publish
  // timestamp. NEVER `new Date()` — see note in app/tools/sitemap.ts.
  const fresh = await getLastChangedAtBatch(
    comparisons.map((c) => `/compare/${c.slug}`),
  )

  // Phase 9 B2 (2026-05-28): bump compare priority 0.8 → 0.95. The 2026-05-28
  // GSC audit found compares only 34% indexed (vs tools at 93%). Sitemap
  // priority is a relative signal — bumping compares above the 0.8 default
  // tells Google to prefer crawling compares when budget is constrained.
  let newestCompare: Date | undefined
  const comparisonRoutes: MetadataRoute.Sitemap = comparisons.map((c) => {
    const lastModified =
      fresh.get(`/compare/${c.slug}`) ??
      (c.last_reviewed_at
        ? new Date(c.last_reviewed_at)
        : c.published_at
        ? new Date(c.published_at)
        : undefined)
    if (lastModified && (!newestCompare || lastModified > newestCompare)) {
      newestCompare = lastModified
    }
    return {
      url: `${BASE_URL}/compare/${c.slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'monthly' as const,
      priority: 0.95,
    }
  })

  // Phase 7H follow-up: include paginated /compare?page=N URLs so Googlebot
  // discovers + crawls every page of the editorial-compare listing. Their
  // lastmod is the freshest compare in the set (the listing changes whenever
  // any compare does), not `new Date()`.
  const compareHubPages = Math.max(1, Math.ceil(comparisons.length / 24))
  const compareHubPagedRoutes: MetadataRoute.Sitemap = []
  for (let p = 2; p <= compareHubPages; p++) {
    compareHubPagedRoutes.push({
      url: `${BASE_URL}/compare?page=${p}`,
      ...(newestCompare ? { lastModified: newestCompare } : {}),
      changeFrequency: 'daily',
      priority: 0.7,
    })
  }

  return [...compareHubPagedRoutes, ...comparisonRoutes]
}
