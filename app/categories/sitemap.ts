import type { MetadataRoute } from 'next'
import { getAdminClient } from '@/lib/cron/supabase-admin'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Cookie-free admin client so this stays cached (getCategories() uses the
  // cookie-reading createClient() — a request-time API that would opt the
  // route out of Next 16's default sitemap caching). Same fix as tools/compare.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any
  const { data } = await db
    .from('categories')
    .select('slug, updated_at')
    .order('sort_order', { ascending: true })
  const categories = (data ?? []) as { slug: string; updated_at?: string | null }[]

  return categories.map((cat) => ({
    url: `${BASE_URL}/categories/${cat.slug}`,
    // Omit lastModified rather than emitting `new Date()` — a sitemap that
    // claims every URL changed on every crawl trains engines to ignore lastmod.
    ...(cat.updated_at ? { lastModified: new Date(cat.updated_at) } : {}),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))
}
