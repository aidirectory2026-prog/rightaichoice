// Phase 8 traction gate (2026-05-16):
// For each ingest candidate, probe HN + Reddit for real-world buzz so we
// only admit tools that have actual traction (not generic "appeared on
// a list" picks). Probes are fast + free:
//   - HN Algolia search API (no auth, 1s per probe)
//   - Reddit JSON search (no auth, 1s per probe)
//
// Per-candidate cost: ~2s sequential. Run via Promise.all in ingest.ts
// to amortize across the batch.

type HnResult = {
  storyCount: number       // stories last 30 days
  maxPoints: number        // top story points last 30 days
  totalComments: number    // sum across last 30 days
}

type RedditResult = {
  threadCount: number      // unique threads last 30 days mentioning the name
  totalUpvotes: number     // sum of upvotes across those threads
}

export type TractionSignal = {
  hn: HnResult
  reddit: RedditResult
  /** Composite score: HN points + reddit_threads × 30 + reddit_upvotes × 0.1. */
  score: number
  /** True if any single signal is strong enough to call "trending". */
  hardPass: boolean
}

const HN_ALGOLIA = 'https://hn.algolia.com/api/v1/search'
const REDDIT_SEARCH = 'https://www.reddit.com/search.json'

const HN_HARD_FLOOR = 30          // any story with ≥30 points in last 30d → pass
const REDDIT_THREAD_FLOOR = 3     // ≥3 unique threads in last 30d → pass
const SCORE_FLOOR = 80            // composite threshold if no single hard hit
const WINDOW_DAYS = 30

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
    if (!res.ok) return { storyCount: 0, maxPoints: 0, totalComments: 0 }
    const json = (await res.json()) as {
      hits: Array<{ points?: number; num_comments?: number }>
    }
    const hits = json.hits ?? []
    return {
      storyCount: hits.length,
      maxPoints: hits.reduce((m, h) => Math.max(m, h.points ?? 0), 0),
      totalComments: hits.reduce((s, h) => s + (h.num_comments ?? 0), 0),
    }
  } catch {
    return { storyCount: 0, maxPoints: 0, totalComments: 0 }
  }
}

async function probeReddit(toolName: string): Promise<RedditResult> {
  // Reddit JSON search — no auth, sorted by relevance. Restrict to last
  // 30 days via the `t` param (week / month / year — we use month).
  const q = encodeURIComponent(`"${toolName}"`)
  const url = `${REDDIT_SEARCH}?q=${q}&restrict_sr=false&t=month&limit=25&sort=relevance`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RightAIChoice-Ingest/1.0 (rightaichoice.com)',
      },
    })
    if (!res.ok) return { threadCount: 0, totalUpvotes: 0 }
    const json = (await res.json()) as {
      data?: { children?: Array<{ data?: { ups?: number; created_utc?: number } }> }
    }
    const cutoff = days(WINDOW_DAYS)
    const fresh = (json.data?.children ?? []).filter(
      (c) => (c.data?.created_utc ?? 0) >= cutoff,
    )
    return {
      threadCount: fresh.length,
      totalUpvotes: fresh.reduce((s, c) => s + (c.data?.ups ?? 0), 0),
    }
  } catch {
    return { threadCount: 0, totalUpvotes: 0 }
  }
}

function computeScore(hn: HnResult, reddit: RedditResult): number {
  return hn.maxPoints + reddit.threadCount * 30 + reddit.totalUpvotes * 0.1
}

export async function probeTraction(toolName: string): Promise<TractionSignal> {
  const [hn, reddit] = await Promise.all([probeHN(toolName), probeReddit(toolName)])
  const score = computeScore(hn, reddit)
  const hardPass =
    hn.maxPoints >= HN_HARD_FLOOR ||
    reddit.threadCount >= REDDIT_THREAD_FLOOR ||
    score >= SCORE_FLOOR
  return { hn, reddit, score, hardPass }
}

/** Probe an array of candidates in parallel; returns map keyed by name. */
export async function probeTractionBatch(
  names: string[],
  concurrency = 5,
): Promise<Map<string, TractionSignal>> {
  const out = new Map<string, TractionSignal>()
  const queue = [...names]
  async function worker() {
    while (queue.length > 0) {
      const name = queue.shift()
      if (!name) return
      const signal = await probeTraction(name)
      out.set(name, signal)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return out
}
