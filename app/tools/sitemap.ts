import type { MetadataRoute } from 'next'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { getLastChangedAtBatch } from '@/lib/seo/freshness'

const BASE_URL = 'https://rightaichoice.com'

// Next 16: a sitemap is a Route Handler that is CACHED BY DEFAULT unless it
// uses a request-time API. The previous version called getAllToolSlugs(), which
// uses the cookie-reading server client (`createClient()`) — a request-time API
// that opted this route OUT of caching. Result: every crawler hit paid a ~3.4s
// uncached DB render, which exceeded Bing's sitemap-fetch tolerance and left
// /tools/sitemap.xml stuck "Pending" in Bing Webmaster (0 of ~1,994 tools
// ingested → near-zero Bing index → zero Bing/Copilot/ChatGPT-search traffic).
//
// Fix: read slugs via the cookie-free admin (service-role) client — the same
// client getLastChangedAtBatch() already uses. With no request-time API, Next
// caches this route again and the CDN serves a fast copy that Bing can ingest.
export const revalidate = 3600 // ISR: regenerate hourly so new tools appear

async function getPublishedToolSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getAdminClient() as any
  const out: { slug: string; updated_at: string }[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('tools')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) break
    const rows = (data ?? []) as { slug: string; updated_at: string }[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tools = await getPublishedToolSlugs()

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
