import type { MetadataRoute } from 'next'
import { ROLE_PAGES } from '@/lib/data/role-pages'
import { getLastChangedAtBatch } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ROLE_PAGES.filter((r) => !r.noindex)
  // Phase 10 #8 — real per-path freshness instead of `new Date()` every rebuild.
  const fresh = await getLastChangedAtBatch(pages.map((r) => `/for/${r.slug}`))
  return pages.map((r) => {
    const lastModified = fresh.get(`/for/${r.slug}`)
    return {
      url: `${BASE_URL}/for/${r.slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }
  })
}
