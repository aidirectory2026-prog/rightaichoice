import type { MetadataRoute } from 'next'
import { BEST_PAGES } from '@/lib/data/best-pages'
import { getLastChangedAtBatch } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = BEST_PAGES.filter((p) => !p.noindex)
  // Phase 10 #8 — emit REAL per-path freshness (was `new Date()` on every
  // regeneration, which makes Google distrust every lastmod and drop the
  // freshness boost). Omit lastModified when we have no real change date.
  const fresh = await getLastChangedAtBatch(pages.map((p) => `/best/${p.slug}`))
  return pages.map((p) => {
    const lastModified = fresh.get(`/best/${p.slug}`)
    return {
      url: `${BASE_URL}/best/${p.slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }
  })
}
