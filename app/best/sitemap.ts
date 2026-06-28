import type { MetadataRoute } from 'next'
import { BEST_PAGES, MIN_INDEXABLE_TOOLS } from '@/lib/data/best-pages'
import { getBestPageTools } from '@/lib/data/best-page-tools'
import { getLastChangedAtBatch } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

// Bounded-concurrency map so the per-page tool-count probe doesn't open 91
// connections at once during sitemap regeneration.
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
  // BUG-06: exclude manually-noindexed AND auto-noindexed THIN pages (the same
  // <MIN_INDEXABLE_TOOLS gate the page emits as a robots tag), so the sitemap
  // never advertises a URL that serves noindex.
  const candidates = BEST_PAGES.filter((p) => !p.noindex)
  const counts = await mapLimit(candidates, 8, async (p) => ({ p, n: (await getBestPageTools(p)).length }))
  const pages = counts.filter((c) => c.n >= MIN_INDEXABLE_TOOLS).map((c) => c.p)
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
