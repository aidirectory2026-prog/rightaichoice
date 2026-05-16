import type { MetadataRoute } from 'next'
import { getAllComparisonSlugs } from '@/lib/data/comparisons'

const BASE_URL = 'https://rightaichoice.com'

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

  const comparisonRoutes: MetadataRoute.Sitemap = comparisons.map((c) => ({
    url: `${BASE_URL}/compare/${c.slug}`,
    lastModified: c.last_reviewed_at
      ? new Date(c.last_reviewed_at)
      : c.published_at
      ? new Date(c.published_at)
      : new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [...compareHubPagedRoutes, ...comparisonRoutes]
}
