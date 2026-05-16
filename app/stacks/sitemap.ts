import type { MetadataRoute } from 'next'
import { STACKS } from '@/lib/data/stacks'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return STACKS.map((s) => ({
    url: `${BASE_URL}/stacks/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))
}
