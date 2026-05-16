import type { MetadataRoute } from 'next'
import { getAllToolSlugs } from '@/lib/data/tools'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tools = await getAllToolSlugs()
  return tools.map(({ slug, updated_at }) => ({
    url: `${BASE_URL}/tools/${slug}`,
    lastModified: updated_at ? new Date(updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }))
}
