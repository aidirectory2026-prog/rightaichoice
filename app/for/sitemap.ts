import type { MetadataRoute } from 'next'
import { ROLE_PAGES } from '@/lib/data/role-pages'
import { MIN_INDEXABLE_TOOLS } from '@/lib/data/best-pages'
import { getRolePageTools } from '@/lib/data/role-page-tools'
import { getLastChangedAtBatch } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

async function mapLimit<T, R>(items: T[], limit: number, fn: (it: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // BUG-06: drop manually-noindexed AND auto-noindexed THIN role pages.
  const candidates = ROLE_PAGES.filter((r) => !r.noindex)
  const counts = await mapLimit(candidates, 8, async (r) => ({ r, n: (await getRolePageTools(r)).length }))
  const pages = counts.filter((c) => c.n >= MIN_INDEXABLE_TOOLS).map((c) => c.r)
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
