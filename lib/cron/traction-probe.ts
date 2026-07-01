// Traction gate (2026-05-16; multi-source aggregate 2026-07-01).
//
// For each ingest candidate, measure real-world traction from several
// product-specific sources and admit only tools with genuine adoption (not
// "appeared on a list" spam). The gate is an OR-of-many: a tool passes if it's
// strong on ANY reliable source, so no single blocked/flaky source can zero-out
// ingestion (the failure mode that froze the catalog for weeks).
//
// Sources, by reliability:
//   - Hacker News (Algolia)   — keyless, reliable. Story points/comments.
//   - GitHub stars            — GITHUB_REPO_TOKEN (or keyless-lite). Unambiguous
//                               adoption for OSS/dev tools; strict name match.
//   - Product Hunt votes      — PRODUCTHUNT_TOKEN. The canonical launchpad for new
//                               AI tools; upvotes tied to the exact product page.
//   - Reddit (Apify)          — BONUS only. Keyword-search is noisy for common-word
//                               names, so Reddit can only help a tool PASS; it never
//                               contributes to `probed` and so can never cause a
//                               reject. Scraped via Apify (no Reddit account needed).
//
// `probed` = did at least one RELIABLE source (HN/GitHub/PH) answer. If none did
// (rare total outage), curate.ts skips the hard-reject and falls back to the soft
// criteria. Every ingest inserts as a DRAFT — the onboard SOP lane is the real
// publish bar — so the gate errs toward admitting, never toward silence.

import { runActorAndCollect } from '@/lib/seo/apify-client'
import { probeGitHubStars } from '@/lib/scrapers/github-signals'
import { scrapeProductHunt } from '@/lib/scrapers/producthunt'

type HnResult = {
  storyCount: number
  maxPoints: number
  totalComments: number
  ok: boolean
}

type RedditResult = {
  threadCount: number
  totalUpvotes: number
  ok: boolean
}

type GhResult = { stars: number; ok: boolean }
type PhResult = { votes: number; ok: boolean }

export type TractionSignal = {
  hn: HnResult
  github: GhResult
  ph: PhResult
  reddit: RedditResult
  /** Composite score across all sources (see computeScore). */
  score: number
  /** True if any single source clears its hard floor, or the composite does. */
  hardPass: boolean
  /** True if at least one RELIABLE source (HN/GitHub/PH) responded. Reddit is
   *  excluded — a Reddit outage must never authorize a hard-reject. When false the
   *  probe was inconclusive and curate.ts must NOT hard-reject. */
  probed: boolean
}

const HN_ALGOLIA = 'https://hn.algolia.com/api/v1/search'

// Reddit-via-Apify config (bonus signal).
const REDDIT_ACTOR = 'fatihtahta/reddit-scraper-search-fast'
const REDDIT_SORT = 'relevance'
const REDDIT_TIMEFRAME = 'year'
const REDDIT_MAX_POSTS = 10
const REDDIT_RUN_TIMEOUT_MS = 8 * 60_000

// Hard floors — clearing any ONE of these = enough traction to admit (as a
// DRAFT). Calibrated for an EMERGING-AI-tools catalog: a published repo with a
// few hundred stars, or a real HN/PH/Reddit footprint, is a legitimate draft.
// The onboard SOP lane is the real publish bar, so we admit generously here and
// gate only tools with ~zero verifiable signal anywhere.
const HN_HARD_FLOOR = 20          // story ≥20 points in last 30d
const GH_STAR_FLOOR = 150         // ≥150 GitHub stars on the name-matched repo
const PH_VOTE_FLOOR = 80          // ≥80 Product Hunt upvotes
const REDDIT_THREAD_FLOOR = 3     // ≥3 relevant Reddit threads in the past year
const SCORE_FLOOR = 40            // composite threshold — catches "moderate on ≥2 sources"
const WINDOW_DAYS = 30

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
    const res = await fetch(url, { headers: { 'User-Agent': 'RightAIChoice-Ingest/1.0' } })
    if (!res.ok) return { storyCount: 0, maxPoints: 0, totalComments: 0, ok: false }
    const json = (await res.json()) as { hits: Array<{ points?: number; num_comments?: number }> }
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

// Product Hunt upvotes for the tool's launch (resolved by slug). ok:false means
// we couldn't check (no token / API error) — NOT "no PH presence".
async function probePH(toolName: string): Promise<PhResult> {
  if (!process.env.PRODUCTHUNT_TOKEN) return { votes: 0, ok: false }
  const res = await scrapeProductHunt(toolName)
  if (res.error) return { votes: 0, ok: false }
  const card = res.posts.find((p) => p.source === 'producthunt')
  return { votes: card?.score ?? 0, ok: true }
}

// ── Reddit (Apify) — bonus signal, batched once per cohort ──────────────────
type RedditActorItem = {
  kind?: string
  query?: string
  title?: string
  body?: string
  subreddit?: string
  score?: number
  created_utc?: string
  permalink?: string
}

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

async function probeRedditBatch(names: string[]): Promise<Map<string, RedditResult>> {
  const out = new Map<string, RedditResult>()
  if (names.length === 0) return out
  if (!process.env.APIFY_TOKEN) return out

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
    return out
  }

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

// ── Aggregate ───────────────────────────────────────────────────────────────
function computeScore(hn: HnResult, github: GhResult, ph: PhResult, reddit: RedditResult): number {
  return (
    hn.maxPoints +
    github.stars * 0.08 +
    ph.votes * 0.4 +
    reddit.threadCount * 25 +
    reddit.totalUpvotes * 0.05
  )
}

function buildSignal(hn: HnResult, github: GhResult, ph: PhResult, reddit: RedditResult): TractionSignal {
  const score = computeScore(hn, github, ph, reddit)
  const hardPass =
    hn.maxPoints >= HN_HARD_FLOOR ||
    github.stars >= GH_STAR_FLOOR ||
    ph.votes >= PH_VOTE_FLOOR ||
    reddit.threadCount >= REDDIT_THREAD_FLOOR ||
    score >= SCORE_FLOOR
  // Only the reliable, product-specific sources count toward "did we get a read".
  const probed = hn.ok || github.ok || ph.ok
  return { hn, github, ph, reddit, score, hardPass, probed }
}

export async function probeTraction(toolName: string): Promise<TractionSignal> {
  const [hn, github, ph, redditMap] = await Promise.all([
    probeHN(toolName),
    probeGitHubStars(toolName),
    probePH(toolName),
    probeRedditBatch([toolName]),
  ])
  return buildSignal(hn, github, ph, redditMap.get(toolName) ?? REDDIT_UNAVAILABLE)
}

/** Probe candidates for traction. Reddit is fetched once for the whole batch
 *  (single Apify run); HN, GitHub and Product Hunt are probed per candidate. */
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
      const [hn, github, ph] = await Promise.all([
        probeHN(name),
        probeGitHubStars(name),
        probePH(name),
      ])
      out.set(name, buildSignal(hn, github, ph, redditMap.get(name) ?? REDDIT_UNAVAILABLE))
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return out
}
