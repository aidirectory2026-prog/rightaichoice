import type { MetadataRoute } from 'next'
import { ROLE_PAGES } from '@/lib/data/role-pages'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return ROLE_PAGES.map((r) => ({
    url: `${BASE_URL}/for/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))
}
