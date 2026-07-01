// Phase 8 traction gate (2026-05-16); Reddit signal via Apify (2026-07-01).
//
// For each ingest candidate, probe HN + Reddit for real-world buzz so we only
// admit tools with actual traction (not generic "appeared on a list" picks).
//
//   - HN:     Algolia search API (no auth, ~1s per probe, per-candidate).
//   - Reddit: ONE batched Apify actor run for the whole cohort.
//
// Why Apify for Reddit: Reddit 403s its tokenless *.json / search endpoints from
// datacenter + CI IPs, and the owner cannot create a Reddit API app (tried
// repeatedly — confirmed dead end). Apify's actor scrapes Reddit search from
// proxied infrastructure with NO Reddit account/key, using the APIFY_TOKEN the
// pipeline already has. `queries[]` = candidate names, `timeframe=month` → real
// last-30-day buzz for the entire batch in a single cheap run (~$0.0015/result).
//
// If APIFY_TOKEN is missing OR the run fails, reddit.ok=false for the affected
// names and the curate gate degrades gracefully (see curate.ts `redditOk`) — a
// missing signal never zero-outs ingestion.

import { runActorAndCollect } from '@/lib/seo/apify-client'

type HnResult = {
  storyCount: number       // stories last 30 days
  maxPoints: number        // top story points last 30 days
  totalComments: number    // sum across last 30 days
  ok: boolean              // the probe actually got a response (not an error)
}

type RedditResult = {
  threadCount: number      // unique threads last 30 days mentioning the name
  totalUpvotes: number     // sum of upvotes across those threads
  ok: boolean              // the probe actually got a response (not an error)
}

export type TractionSignal = {
  hn: HnResult
  reddit: RedditResult
  /** Composite score: HN points + reddit_threads × 30 + reddit_upvotes × 0.1. */
  score: number
  /** True if any single signal is strong enough to call "trending". */
  hardPass: boolean
  /** Phase 10 #56 — true only if at least one source responded. When false the
   *  probe was inconclusive (outage/block) and must NOT be used to hard-reject —
   *  "probe failed" is not the same as "no buzz". */
  probed: boolean
}

const HN_ALGOLIA = 'https://hn.algolia.com/api/v1/search'

// Reddit-via-Apify config.
//
// sort=relevance (NOT new): Reddit's relevance ranking surfaces actual product
// discussion; sort=new returns the freshest keyword mentions, which for common
// names ("Cursor"→mouse cursor, "Granola"→cereal) is almost all noise.
// timeframe=year: a traction gate for freshly-discovered tools needs a wide
// enough window to see any real discussion; a 30-day window is too sparse for
// niche/new tools. This is a COARSE pre-filter — HN + soft criteria + the
// DRAFT/SOP publish gate are the real bars — so a wider, more-lenient window is
// the safe direction (over-admit drafts, never silently admit nothing).
const REDDIT_ACTOR = 'fatihtahta/reddit-scraper-search-fast'
const REDDIT_SORT = 'relevance'
const REDDIT_TIMEFRAME = 'year'
const REDDIT_MAX_POSTS = 10           // per candidate — enough to clear the ≥3-thread floor
const REDDIT_RUN_TIMEOUT_MS = 8 * 60_000

const HN_HARD_FLOOR = 30          // any story with ≥30 points in last 30d → pass
const REDDIT_THREAD_FLOOR = 3     // ≥3 relevant threads in the past year → pass
const SCORE_FLOOR = 80            // composite threshold if no single hard hit
const WINDOW_DAYS = 30

// Product-discussion cues. A generic-word tool name ("Cursor", "Linear",
// "Notion") keyword-matches off-topic noise ("cursor: pointer", "linear
// gradient"); outside the tool's own subreddit we keep a post only if the name
// is in the TITLE and it pairs with one of these cues.
const PRODUCT_CUES = [
  'app', 'tool', 'software', 'saas', ' ai', 'ai ', 'ide', 'editor', 'extension', 'plugin',
  'pricing', 'price', 'subscription', 'paid', 'plan', 'tier', 'alternative', 'review',
  'using', ' use', 'used', 'feature', 'workflow', 'integration', 'api', 'dashboard',
  'login', 'sync', 'export', 'template', 'automation', ' vs ', 'recommend', 'setup',
]

const REDDIT_UNAVAILABLE: RedditResult = { threadCount: 0, totalUpvotes: 0, ok: false }

function days(n: number) {
  return Math.floor(Date.now() / 1000) - n * 86_400
}

async function probeHN(toolName: string): Promise<HnResult> {
  const since = days(WINDOW_DAYS)
  const q = encodeURIComponent(`"${toolName}"`)
  const url = `${HN_ALGOLIA}?query=${q}&tags=story&numericFilters=created_at_i>${since}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RightAIChoice-Ingest/1.0' },
    })
    if (!res.ok) return { storyCount: 0, maxPoints: 0, totalComments: 0, ok: false }
    const json = (await res.json()) as {
      hits: Array<{ points?: number; num_comments?: number }>
    }
    const hits = json.hits ?? []
    return {
      storyCount: hits.length,
      maxPoints: hits.reduce((m, h) => Math.max(m, h.points ?? 0), 0),
      totalComments: hits.reduce((s, h) => s + (h.num_comments ?? 0), 0),
      ok: true,
    }
  } catch {
    return { storyCount: 0, maxPoints: 0, totalComments: 0, ok: false }
  }
}

// Apify Reddit post item (subset of fields we use).
type RedditActorItem = {
  kind?: string
  query?: string        // the search phrase that surfaced this post → attribution
  title?: string
  body?: string
  subreddit?: string
  score?: number
  created_utc?: string  // ISO string
  permalink?: string
}

// Keep a post only if it's genuinely about the tool. Three accept paths, in
// increasing looseness:
//   1. it's in the tool's own subreddit (r/<brand>) — strongest signal;
//   2. the name is in the TITLE (word-boundary) — a post titled after the tool;
//   3. the name is in the body AND a product cue co-occurs — a discussion that
//      mentions the tool in a product context (drops "cereal granola" chatter,
//      keeps "we switched our SaaS stack to <tool>" threads).
// Imperfect for common-word names by nature — but the gate is coarse and errs
// toward admitting (as a draft), never toward silently admitting nothing.
function isRelevant(name: string, title: string, body: string, subreddit?: string): boolean {
  const nameLower = name.toLowerCase()
  const nameWb = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  const brand = nameLower.replace(/[^a-z0-9]/g, '')
  const text = `${title} ${body}`.toLowerCase()
  const inBrandSub = brand.length >= 3 && !!subreddit && subreddit.toLowerCase().includes(brand)
  if (inBrandSub) return true
  if (nameWb.test(title)) return true
  return nameWb.test(body) && PRODUCT_CUES.some((c) => text.includes(c))
}

/**
 * Batched Reddit buzz probe via Apify — one actor run covers every name.
 *
 * Returns a map keyed by candidate name. A name present with ok:true and
 * threadCount 0 means "we checked Reddit and found no recent discussion" (a real
 * no-buzz signal). A name ABSENT from the map (no token / run failed) means the
 * signal was unavailable — callers fall back to REDDIT_UNAVAILABLE (ok:false) so
 * the gate degrades instead of wrongly hard-rejecting.
 */
export async function probeRedditBatch(names: string[]): Promise<Map<string, RedditResult>> {
  const out = new Map<string, RedditResult>()
  if (names.length === 0) return out
  if (!process.env.APIFY_TOKEN) return out // no token → all unavailable → gate degrades

  let items: RedditActorItem[]
  try {
    items = await runActorAndCollect<RedditActorItem>(
      REDDIT_ACTOR,
      {
        queries: names,
        sort: REDDIT_SORT,
        timeframe: REDDIT_TIMEFRAME,
        maxPosts: REDDIT_MAX_POSTS,
        strictSearch: true,
        scrapeComments: false,
      },
      { timeoutMs: REDDIT_RUN_TIMEOUT_MS },
    )
  } catch {
    return out // run failed → all unavailable → gate degrades
  }

  // Seed every requested name as "checked, no buzz" (the run succeeded).
  const seenByName = new Map<string, Set<string>>()
  for (const name of names) {
    out.set(name, { threadCount: 0, totalUpvotes: 0, ok: true })
    seenByName.set(name, new Set())
  }

  for (const it of items) {
    if (it.kind && it.kind !== 'post') continue
    const name = it.query
    if (!name || !out.has(name)) continue
    const title = (it.title ?? '').trim()
    const body = (it.body ?? '').trim()
    if (!isRelevant(name, title, body, it.subreddit)) continue
    const key = it.permalink ?? `${title}|${it.created_utc ?? ''}`
    const seen = seenByName.get(name)!
    if (seen.has(key)) continue
    seen.add(key)
    const r = out.get(name)!
    r.threadCount += 1
    r.totalUpvotes += typeof it.score === 'number' ? it.score : 0
  }
  return out
}

function computeScore(hn: HnResult, reddit: RedditResult): number {
  return hn.maxPoints + reddit.threadCount * 30 + reddit.totalUpvotes * 0.1
}

function buildSignal(hn: HnResult, reddit: RedditResult): TractionSignal {
  const score = computeScore(hn, reddit)
  const hardPass =
    hn.maxPoints >= HN_HARD_FLOOR ||
    reddit.threadCount >= REDDIT_THREAD_FLOOR ||
    score >= SCORE_FLOOR
  // probed = at least one source actually responded. If both errored, the gate
  // can't conclude "no buzz" — curate.ts skips the hard-reject in that case.
  return { hn, reddit, score, hardPass, probed: hn.ok || reddit.ok }
}

export async function probeTraction(toolName: string): Promise<TractionSignal> {
  const [hn, redditMap] = await Promise.all([probeHN(toolName), probeRedditBatch([toolName])])
  return buildSignal(hn, redditMap.get(toolName) ?? REDDIT_UNAVAILABLE)
}

/** Probe an array of candidates; returns map keyed by name. Reddit is fetched
 *  once for the whole batch (single Apify run); HN is probed per-candidate. */
export async function probeTractionBatch(
  names: string[],
  concurrency = 5,
): Promise<Map<string, TractionSignal>> {
  const redditMap = await probeRedditBatch(names)
  const out = new Map<string, TractionSignal>()
  const queue = [...names]
  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift()
      if (!name) return
      const hn = await probeHN(name)
      out.set(name, buildSignal(hn, redditMap.get(name) ?? REDDIT_UNAVAILABLE))
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return out
}
