import type { MetadataRoute } from 'next'
import { getAdminClient } from '@/lib/cron/supabase-admin'

const BASE_URL = 'https://rightaichoice.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Cookie-free admin client so this stays cached (getCategories() uses the
  // cookie-reading createClient() — a request-time API that would opt the
  // route out of Next 16's default sitemap caching). Same fix as tools/compare.
  // Fable-5 audit (2026-06-15): was selecting `updated_at`, a column the
  // categories table DOESN'T HAVE (cols: id,name,slug,description,icon,
  // sort_order,created_at). PostgREST errored, `data` came back null, and the
  // sitemap rendered EMPTY — all 18 category hub pages were missing from every
  // sitemap. Use `created_at` (exists).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getAdminClient() as any
  const { data } = await db
    .from('categories')
    .select('slug, created_at')
    .order('sort_order', { ascending: true })
  const categories = (data ?? []) as { slug: string; created_at?: string | null }[]

  return categories.map((cat) => ({
    url: `${BASE_URL}/categories/${cat.slug}`,
    // Omit lastModified rather than emitting `new Date()` — a sitemap that
    // claims every URL changed on every crawl trains engines to ignore lastmod.
    ...(cat.created_at ? { lastModified: new Date(cat.created_at) } : {}),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }))
}
