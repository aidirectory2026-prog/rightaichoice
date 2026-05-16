import type { MetadataRoute } from 'next'
import { BEST_PAGES } from '@/lib/data/best-pages'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return BEST_PAGES.map((p) => ({
    url: `${BASE_URL}/best/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))
}
