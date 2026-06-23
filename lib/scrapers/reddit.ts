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
 * Search Reddit for opinions about a tool. Never throws — failures return an
 * error-tagged empty result.
 *
 * Two paths:
 *  - OAuth (preferred): if REDDIT_CLIENT_ID/SECRET are set, hit oauth.reddit.com —
 *    full, current, reliable. Auto-used the moment creds exist.
 *  - PullPush (keyless fallback): when there are NO creds, the tokenless
 *    reddit.com JSON endpoint 403s from datacenter IPs (Vercel) → 0 results.
 *    Phase 12 Bug-3.2 (2026-06-23): fall back to the free, keyless PullPush
 *    Reddit search API (api.pullpush.io, a maintained Pushshift successor),
 *    which works from any IP. This makes Reddit data flow with ZERO setup —
 *    no Reddit app, no API key — and silently upgrades to the official API if
 *    creds are ever added.
 */
export async function scrapeReddit(toolName: string): Promise<ScrapeResult> {
  const token = await getAppToken().catch(() => null)
  return token ? scrapeRedditOAuth(toolName, token) : scrapeRedditPullPush(toolName)
}

async function scrapeRedditOAuth(toolName: string, token: string): Promise<ScrapeResult> {
  const posts: ScrapedPost[] = []
  try {
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT, Authorization: `Bearer ${token}` }
    const query = encodeURIComponent(`"${toolName}"`)

    const mainRes = await fetch(`${OAUTH_API}/search?q=${query}&sort=relevance&limit=25&t=year`, { headers })
    if (!mainRes.ok) {
      // Token but API rejected (rate limit / transient) — try the keyless path
      // rather than returning nothing.
      return scrapeRedditPullPush(toolName)
    }
    const data = await mainRes.json()
    mapChildren((data?.data?.children ?? []) as RedditChild[], posts)

    const subResults = await Promise.all(
      TARGET_SUBREDDITS.slice(0, 4).map(async (sub) => {
        try {
          const subRes = await fetch(`${OAUTH_API}/r/${sub}/search?q=${query}&restrict_sr=on&sort=relevance&limit=5&t=year`, { headers })
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
    return { source: 'reddit', posts: [], error: err instanceof Error ? err.message : 'Unknown error', scrapedAt: new Date().toISOString() }
  }
}

// ── Keyless fallback: PullPush (free, no API key, works from datacenter IPs) ──
const PULLPUSH = 'https://api.pullpush.io/reddit/search/submission/'

type PullPushPost = {
  title?: string
  selftext?: string
  author?: string
  created_utc?: number
  score?: number
  num_comments?: number
  permalink?: string
  url?: string
  subreddit?: string
}

// Product-discussion cues. A generic-word tool name ("Cursor", "Linear",
// "Notion") keyword-matches CSS / English noise ("cursor: pointer", "linear
// gradient", "the notion of"); we keep a keyless-path post only if it pairs the
// name with one of these (or is in the tool's own subreddit).
const PRODUCT_CUES = [
  'app', 'tool', 'software', 'saas', ' ai', 'ai ', 'ide', 'editor', 'extension', 'plugin',
  'pricing', 'price', 'subscription', 'paid', 'free tier', 'plan', 'tier', 'alternative',
  'review', 'using', ' use', 'used', 'feature', 'workflow', 'integration', 'api', 'dashboard',
  'login', 'sync', 'export', 'template', 'automation', ' vs ', 'experience', 'recommend',
  'switch', 'crash', 'bug', 'support', 'onboard', 'setup', 'interface', 'ux', 'self-host',
]

// Curated tech / SaaS / AI subreddits where genuine tool discussion lives.
// CRITICAL: an unscoped PullPush query sorted by score surfaces viral OFF-topic
// posts that merely contain the word (a game post for "Cursor", world-news for
// "Perplexity"). Scoping each query to these communities keeps only real
// product discussion (verified: q=Cursor in r/programming → "How Cursor Indexes
// Codebases", "My Experience with Cursor").
const PP_SUBS = ['programming', 'webdev', 'SaaS', 'artificial', 'ChatGPT', 'productivity', 'startups', 'software']

async function ppFetch(toolName: string, sub: string): Promise<PullPushPost[]> {
  const q = encodeURIComponent(`"${toolName}"`)
  const url = `${PULLPUSH}?q=${q}&subreddit=${encodeURIComponent(sub)}&size=8&sort=desc&sort_type=score`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return []
    const json = (await res.json()) as { data?: PullPushPost[] }
    return json.data ?? []
  } catch {
    return []
  }
}

async function scrapeRedditPullPush(toolName: string): Promise<ScrapeResult> {
  // Fan out across the curated tech subs + the tool's OWN subreddit (r/<brand>,
  // where it exists — that's the richest, on-topic source). Each call is
  // independent; a slow/empty one doesn't sink the rest.
  const brand = toolName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const subs = [...PP_SUBS, brand].filter((s, i, a) => s.length > 1 && a.indexOf(s) === i)
  const batches = await Promise.all(subs.map((sub) => ppFetch(toolName, sub)))
  const raw = batches.flat().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

  const nameLower = toolName.toLowerCase()
  const nameWb = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  const posts: ScrapedPost[] = []
  const seen = new Set<string>()
  for (const p of raw) {
    const title = (p.title ?? '').trim()
    let body = (p.selftext ?? '').trim()
    if (body === '[removed]' || body === '[deleted]') body = ''
    if (!title && !body) continue // nothing usable (removed link post)

    // Relevance gate: in the tool's OWN subreddit (r/<brand>), or the name +
    // a product cue co-occur. Drops generic-word false matches.
    const text = `${title} ${body}`.toLowerCase()
    const inBrandSub = brand.length >= 3 && !!p.subreddit && p.subreddit.toLowerCase().includes(brand)
    // Outside the tool's own sub, demand the name in the TITLE (word-boundary, so
    // "notions" / "linear gradient" / incidental body mentions don't match) AND a
    // product cue — high precision for a paid report.
    const onTopic = nameWb.test(title) && PRODUCT_CUES.some((c) => text.includes(c))
    if (!inBrandSub && !onTopic) continue

    const link = p.permalink ? `https://reddit.com${p.permalink}` : p.url
    if (link && seen.has(link)) continue
    if (link) seen.add(link)
    posts.push({
      source: 'reddit',
      title,
      body: body.slice(0, 1500),
      author: p.author && p.author !== '[deleted]' ? p.author : undefined,
      date: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : undefined,
      score: typeof p.score === 'number' ? p.score : undefined,
      url: link,
    })
  }
  return { source: 'reddit', posts: posts.slice(0, 30), scrapedAt: new Date().toISOString() }
}
