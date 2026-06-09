import type { MetadataRoute } from 'next'
import { STACKS } from '@/lib/data/stacks'
import { getLastChangedAtBatch } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = STACKS.filter((s) => !s.noindex)
  // Phase 10 #8 — real per-path freshness instead of `new Date()` every rebuild.
  const fresh = await getLastChangedAtBatch(pages.map((s) => `/stacks/${s.slug}`))
  return pages.map((s) => {
    const lastModified = fresh.get(`/stacks/${s.slug}`)
    return {
      url: `${BASE_URL}/stacks/${s.slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }
  })
}
