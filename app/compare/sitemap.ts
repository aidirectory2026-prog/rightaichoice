import type { MetadataRoute } from 'next'
import { getAllComparisonSlugs } from '@/lib/data/comparisons'

const BASE_URL = 'https://rightaichoice.com'

// Phase 9 Day-4 (2026-05-29): force on-demand generation so a slow build-time
// Supabase round-trip can't kill the deploy (saw 60s+ hangs after the non-AI
// purge). First request after deploy generates + caches via the 1h revalidate.
export const dynamic = 'force-dynamic'
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const comparisons = await getAllComparisonSlugs()

  // Phase 7H follow-up: include paginated /compare?page=N URLs so Googlebot
  // discovers + crawls every page of the editorial-compare listing.
  const compareHubPages = Math.max(1, Math.ceil(comparisons.length / 24))
  const compareHubPagedRoutes: MetadataRoute.Sitemap = []
  for (let p = 2; p <= compareHubPages; p++) {
    compareHubPagedRoutes.push({
      url: `${BASE_URL}/compare?page=${p}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    })
  }

  // Phase 9 B2 (2026-05-28): bump compare priority 0.8 → 0.95. The 2026-05-28
  // GSC audit found compares only 34% indexed (vs tools at 93%). Sitemap
  // priority is a relative signal — bumping compares above the 0.8 default
  // tells Google to prefer crawling compares when budget is constrained.
  const comparisonRoutes: MetadataRoute.Sitemap = comparisons.map((c) => ({
    url: `${BASE_URL}/compare/${c.slug}`,
    lastModified: c.last_reviewed_at
      ? new Date(c.last_reviewed_at)
      : c.published_at
      ? new Date(c.published_at)
      : new Date(),
    changeFrequency: 'monthly',
    priority: 0.95,
  }))

  return [...compareHubPagedRoutes, ...comparisonRoutes]
}
