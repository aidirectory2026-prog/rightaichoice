import type { ScrapeResult, ScrapedPost } from './types'

// Phase 9 S1b (2026-06-01): structured review-site data via DataForSEO —
// pay-as-you-go (~1-2¢/lookup, no monthly base), far cheaper than Apify.
// Covers Trustpilot (and Google reviews) — the star-rating "authority" the
// free social sources lack. DataForSEO review endpoints are TASK-BASED
// (post → poll → get), so this is best-effort under a time budget: in the
// live <45s scan it usually contributes to a later cache refresh rather than
// the first response; in background backfill it has room to complete.
// Returns [] gracefully when DATAFORSEO_LOGIN/PASSWORD are absent. Never throws.
//
// NOTE: DataForSEO has no G2 endpoint — Trustpilot + Google reviews are the
// supported review sites. True G2 review scraping would still need Apify.

const BASE = 'https://api.dataforseo.com/v3'

function authHeader(): string | null {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD
  if (!login || !password) return null
  return `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`
}

/** Root domain from a website URL, e.g. https://www.vercel.com/x → vercel.com */
function rootDomain(website: string): string | null {
  try {
    const h = new URL(website.startsWith('http') ? website : `https://${website}`).hostname
    return h.replace(/^www\./, '')
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

type Task = { id?: string; status_code?: number; result?: unknown }
type TpReview = { rating?: { value?: number }; review_text?: string; user_profile?: { name?: string }; timestamp?: string; url?: string }

async function post(path: string, auth: string, body: unknown): Promise<string | null> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`DataForSEO ${path} ${res.status}`)
  const json = (await res.json()) as { tasks?: Task[] }
  return json.tasks?.[0]?.id ?? null
}

async function pollGet(path: string, auth: string, taskId: string, budgetMs: number): Promise<unknown | null> {
  const deadline = Date.now() + budgetMs
  while (Date.now() < deadline) {
    await sleep(3000)
    const res = await fetch(`${BASE}${path}/${taskId}`, { headers: { Authorization: auth } })
    if (!res.ok) continue
    const json = (await res.json()) as { tasks?: Task[] }
    const task = json.tasks?.[0]
    if (task?.status_code === 20000 && task.result) return task.result
  }
  return null
}

/**
 * Scrape Trustpilot reviews for a tool by its website domain. Best-effort under
 * `budgetMs`. Returns [] without creds, on timeout, or on no match.
 */
export async function scrapeTrustpilot(
  toolName: string,
  website: string | null | undefined,
  budgetMs = 30_000,
): Promise<ScrapeResult> {
  const auth = authHeader()
  const domain = website ? rootDomain(website) : null
  if (!auth || !domain) return { source: 'trustpilot', posts: [], scrapedAt: new Date().toISOString() }

  try {
    const taskId = await post('/business_data/trustpilot/reviews/task_post', auth, [
      { domain, depth: 20, sort_by: 'recency' },
    ])
    if (!taskId) return { source: 'trustpilot', posts: [], scrapedAt: new Date().toISOString() }

    const result = (await pollGet('/business_data/trustpilot/reviews/task_get', auth, taskId, budgetMs)) as
      | { items?: TpReview[] }[]
      | null
    const items = result?.[0]?.items ?? []

    const posts: ScrapedPost[] = items.slice(0, 20).map((r): ScrapedPost => {
      const rating = r.rating?.value
      return {
        source: 'trustpilot',
        title: `Trustpilot review${rating ? ` (${rating}★)` : ''}`,
        body: (r.review_text ?? '').slice(0, 1500),
        author: r.user_profile?.name,
        score: rating,
        sentiment: rating ? (rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'mixed') : undefined,
        date: r.timestamp,
        url: r.url,
      }
    }).filter((p) => p.body.length > 10)

    return { source: 'trustpilot', posts, scrapedAt: new Date().toISOString() }
  } catch (err) {
    return {
      source: 'trustpilot',
      posts: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      scrapedAt: new Date().toISOString(),
    }
  }
}
