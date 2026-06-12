import type { ScrapeResult, ScrapedPost } from './types'

// Fable-5 review (2026-06-13): Bluesky via the PUBLIC AppView search API —
// free, no auth, no key. Replaces the retired Apify Twitter source (the actor
// it called no longer exists and the account has no subscription) as the
// short-form social voice in the sentiment mix.

const PUBLIC_SEARCH = 'https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts'
const AUTH_BASE = 'https://bsky.social/xrpc'

// The anonymous AppView search 403s from many IPs, so we prefer an
// authenticated session when BLUESKY_IDENTIFIER (handle or email) +
// BLUESKY_APP_PASSWORD are configured — a free account, no approval process
// (Settings → App Passwords). Falls back to the public endpoint without them.
let cachedSession: { jwt: string; expiresAt: number } | null = null

async function getSession(): Promise<string | null> {
  const identifier = process.env.BLUESKY_IDENTIFIER
  const password = process.env.BLUESKY_APP_PASSWORD
  if (!identifier || !password) return null
  if (cachedSession && cachedSession.expiresAt > Date.now() + 60_000) return cachedSession.jwt
  try {
    const res = await fetch(`${AUTH_BASE}/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { accessJwt?: string }
    if (!json.accessJwt) return null
    // Access JWTs last ~2h; refresh conservatively after 90 min.
    cachedSession = { jwt: json.accessJwt, expiresAt: Date.now() + 90 * 60_000 }
    return cachedSession.jwt
  } catch {
    return null
  }
}

type BskyPost = {
  uri?: string
  author?: { handle?: string; displayName?: string }
  record?: { text?: string; createdAt?: string }
  likeCount?: number
  repostCount?: number
}

/** at://did:plc:xxx/app.bsky.feed.post/rkey → https://bsky.app/profile/<handle>/post/<rkey> */
function postUrl(p: BskyPost): string | undefined {
  const rkey = p.uri?.split('/').pop()
  if (!rkey || !p.author?.handle) return undefined
  return `https://bsky.app/profile/${p.author.handle}/post/${rkey}`
}

/**
 * Search Bluesky for posts mentioning a tool. Never throws — failures return
 * an error-tagged empty result.
 */
export async function scrapeBluesky(toolName: string): Promise<ScrapeResult> {
  try {
    const jwt = await getSession()
    const url = new URL(jwt ? `${AUTH_BASE}/app.bsky.feed.searchPosts` : PUBLIC_SEARCH)
    url.searchParams.set('q', `"${toolName}"`)
    url.searchParams.set('limit', '25')
    url.searchParams.set('lang', 'en')
    url.searchParams.set('sort', 'top')

    const headers: Record<string, string> = {
      'User-Agent': 'RightAIChoice/1.0 (rightaichoice.com)',
    }
    if (jwt) headers.Authorization = `Bearer ${jwt}`
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      return { source: 'bluesky', posts: [], error: `HTTP ${res.status}`, scrapedAt: new Date().toISOString() }
    }
    const json = (await res.json()) as { posts?: BskyPost[] }

    const posts: ScrapedPost[] = (json.posts ?? [])
      .map((p) => ({
        source: 'bluesky' as const,
        body: (p.record?.text ?? '').slice(0, 1500),
        author: p.author?.displayName || p.author?.handle,
        date: p.record?.createdAt,
        score: (p.likeCount ?? 0) + (p.repostCount ?? 0),
        url: postUrl(p),
      }))
      .filter((p) => p.body.length > 20)

    return { source: 'bluesky', posts, scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'bluesky',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
