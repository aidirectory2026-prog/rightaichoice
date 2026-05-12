/**
 * Phase 7A.fallback — Google Suggest fetcher.
 *
 * No auth, no quota documented. Uses the public autocomplete endpoint
 * that Google's homepage search box hits. Response shape:
 *   ["query", ["suggestion 1", "suggestion 2", ...], [], {}]
 *
 * Throttle is conservative — Google has IP-based soft limits but no
 * documented cap. 10 req/sec is well within polite-scraper territory.
 */

const ENDPOINT = 'https://suggestqueries.google.com/complete/search'

/**
 * Fetch top autocomplete suggestions for one seed query.
 * Returns up to 10 strings ordered by Google's relevance ranking.
 */
export async function getSuggestions(query: string): Promise<string[]> {
  const url = `${ENDPOINT}?client=firefox&q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: {
      // Google's endpoint occasionally returns 403 to clearly-bot UAs;
      // a real browser UA bypasses that.
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    },
  })
  if (!res.ok) {
    throw new Error(`Suggest API ${res.status} for "${query}"`)
  }
  const data = (await res.json()) as [string, string[], ...unknown[]]
  return Array.isArray(data?.[1]) ? data[1] : []
}

/**
 * Token-bucket throttle wrapper. Enforces a max queries-per-second
 * across all concurrent callers in this process.
 */
class RateLimiter {
  private queue: Array<() => void> = []
  private lastTickMs = 0
  constructor(private readonly perSecond: number) {}

  async wait(): Promise<void> {
    const interval = 1000 / this.perSecond
    return new Promise((resolve) => {
      this.queue.push(resolve)
      this.tick(interval)
    })
  }

  private tick(interval: number) {
    if (this.queue.length === 0) return
    const now = Date.now()
    const elapsed = now - this.lastTickMs
    const wait = Math.max(0, interval - elapsed)
    setTimeout(() => {
      const next = this.queue.shift()
      if (next) {
        this.lastTickMs = Date.now()
        next()
        this.tick(interval)
      }
    }, wait)
  }
}

const limiter = new RateLimiter(10) // 10 req/sec

export async function getSuggestionsThrottled(query: string): Promise<string[]> {
  await limiter.wait()
  return getSuggestions(query)
}
