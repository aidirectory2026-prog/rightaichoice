import type { ScrapeResult, ScrapedPost } from './types'

// Phase 9 S1b (2026-06-01): Reddit via OAuth.
// Reddit now 403s its tokenless www.reddit.com/*.json endpoints from
// datacenter IPs (Vercel, CI, etc.), so the old public-JSON path returned
// nothing in production. The free "script" app OAuth flow (client_credentials)
// lifts that block and raises the rate limit to ~100 req/min. If the app
// credentials aren't set we fall back to the public endpoint (works locally
// from residential IPs, harmlessly returns [] where blocked).

const OAUTH_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token'
const OAUTH_API = 'https://oauth.reddit.com'
const PUBLIC_API = 'https://www.reddit.com'
const USER_AGENT = 'web:RightAIChoice:v1.0 (by /u/rightaichoice)'

const TARGET_SUBREDDITS = [
  'SaaS', 'startups', 'Entrepreneur', 'artificial', 'productivity',
  'smallbusiness', 'webdev', 'design', 'marketing', 'datascience',
]

// In-memory app-only token cache (valid ~1h). Module-scoped — survives across
// requests on a warm serverless instance.
let cachedToken: { value: string; expiresAt: number } | null = null

// Exported for lib/cron/traction-probe.ts (fable-5 review): the ingest
// traction gate was left on the tokenless endpoint when this module migrated
// to OAuth on 2026-06-01, so every candidate probed reddit=0 and the catalog
// admitted zero new tools for 11 days. Never throws — null when unconfigured
// or the token grant fails.
export async function getRedditAppToken(): Promise<string | null> {
  return getAppToken().catch(() => null)
}

async function getAppToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID
  const secret = process.env.REDDIT_CLIENT_SECRET
  if (!id || !secret) return null
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: 'grant_type=client_credentials&scope=read',
  })
  if (!res.ok) throw new Error(`Reddit OAuth ${res.status}`)
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Reddit OAuth: no access_token')
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  }
  return cachedToken.value
}

type RedditChild = {
  data: {
    selftext?: string
    title?: string
    author?: string
    created_utc?: number
    score?: number
    permalink?: string
    num_comments?: number
  }
}

function mapChildren(children: RedditChild[], into: ScrapedPost[]) {
  for (const child of children) {
    const post = child.data
    if (!post?.selftext && !post?.title) continue
    const url = post.permalink ? `https://reddit.com${post.permalink}` : undefined
    if (url && into.some((p) => p.url === url)) continue
    into.push({
      source: 'reddit',
      title: post.title ?? '',
      body: (post.selftext ?? '').slice(0, 1500),
      author: post.author,
      date: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
      score: post.score,
      url,
    })
  }
}

/**
 * Search Reddit for opinions about a tool. Uses OAuth when configured (reliable
 * in production), else the public endpoint. Searches all of Reddit + a few
 * high-signal subreddits in parallel. Never throws — failures return an
 * error-tagged empty result.
 */
export async function scrapeReddit(toolName: string): Promise<ScrapeResult> {
  const posts: ScrapedPost[] = []
  try {
    const token = await getAppToken().catch(() => null)
    const base = token ? OAUTH_API : PUBLIC_API
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT }
    if (token) headers.Authorization = `Bearer ${token}`

    const query = encodeURIComponent(`"${toolName}"`)

    const mainRes = await fetch(
      `${base}/search?q=${query}&sort=relevance&limit=25&t=year`,
      { headers },
    )
    if (!mainRes.ok) {
      return { source: 'reddit', posts: [], error: `HTTP ${mainRes.status}${token ? '' : ' (no OAuth creds)'}`, scrapedAt: new Date().toISOString() }
    }
    const data = await mainRes.json()
    mapChildren((data?.data?.children ?? []) as RedditChild[], posts)

    const subResults = await Promise.all(
      TARGET_SUBREDDITS.slice(0, 4).map(async (sub) => {
        try {
          const subRes = await fetch(
            `${base}/r/${sub}/search?q=${query}&restrict_sr=on&sort=relevance&limit=5&t=year`,
            { headers },
          )
          if (!subRes.ok) return [] as RedditChild[]
          const subData = await subRes.json()
          return (subData?.data?.children ?? []) as RedditChild[]
        } catch {
          return [] as RedditChild[]
        }
      }),
    )
    for (const children of subResults) mapChildren(children, posts)

    return { source: 'reddit', posts: posts.slice(0, 30), scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'reddit',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
