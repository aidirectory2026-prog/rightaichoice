import type { ScrapeResult, ScrapedPost } from './types'

// Fable-5 review (2026-06-13): Lemmy — the federated Reddit-style forum
// network — via the largest instance's open API (lemmy.world). Free, no key,
// no approval. A partial Reddit stand-in while our Reddit Data API
// application is pending; stays in the mix afterwards as an independent
// forum voice.

const SEARCH = 'https://lemmy.world/api/v3/search'

type LemmyPostView = {
  post?: { name?: string; body?: string; ap_id?: string; published?: string }
  counts?: { score?: number; comments?: number }
}

/**
 * Search Lemmy for posts mentioning a tool. Never throws.
 */
export async function scrapeLemmy(toolName: string): Promise<ScrapeResult> {
  try {
    const url = new URL(SEARCH)
    url.searchParams.set('q', toolName)
    url.searchParams.set('type_', 'Posts')
    url.searchParams.set('sort', 'TopYear')
    url.searchParams.set('limit', '15')

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'RightAIChoice/1.0 (rightaichoice.com)' },
    })
    if (!res.ok) {
      return { source: 'lemmy', posts: [], error: `HTTP ${res.status}`, scrapedAt: new Date().toISOString() }
    }
    const json = (await res.json()) as { posts?: LemmyPostView[] }

    const posts: ScrapedPost[] = (json.posts ?? [])
      .map((pv) => ({
        source: 'lemmy' as const,
        title: pv.post?.name ?? '',
        body: (pv.post?.body ?? pv.post?.name ?? '').slice(0, 1500),
        score: (pv.counts?.score ?? 0) + (pv.counts?.comments ?? 0),
        date: pv.post?.published,
        url: pv.post?.ap_id,
      }))
      .filter((p) => p.body.length > 20)

    return { source: 'lemmy', posts, scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'lemmy',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
