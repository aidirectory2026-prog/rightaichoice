import type { MetadataRoute } from 'next'
import { getAllToolSlugs } from '@/lib/data/tools'
import { getLastChangedAtBatch } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tools = await getAllToolSlugs()

  // Overlay the freshness cascade (captures editorial/cascade changes that
  // don't touch tools.updated_at) over the source row's real timestamp.
  // NEVER fall back to `new Date()` — a sitemap that claims every URL changed
  // on every crawl trains Google to ignore our <lastmod> entirely.
  const fresh = await getLastChangedAtBatch(
    tools.map(({ slug }) => `/tools/${slug}`),
  )

  return tools.map(({ slug, updated_at }) => {
    const lastModified =
      fresh.get(`/tools/${slug}`) ??
      (updated_at ? new Date(updated_at) : undefined)
    return {
      url: `${BASE_URL}/tools/${slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }
  })
}
