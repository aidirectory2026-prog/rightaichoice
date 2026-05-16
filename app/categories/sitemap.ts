import type { MetadataRoute } from 'next'
import { getCategories } from '@/lib/data/categories'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = await getCategories()
  return categories.map((cat: { slug: string; updated_at?: string }) => ({
    url: `${BASE_URL}/categories/${cat.slug}`,
    lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }))
}
