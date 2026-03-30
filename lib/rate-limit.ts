/**
 * In-memory rate limiter for Next.js API routes.
 *
 * Limits requests per IP per endpoint using a sliding window.
 * Works for single-instance deployments (Vercel serverless warm instances).
 * To scale across instances, swap the Map for Upstash Redis:
 *   https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 *
 * Usage:
 *   const result = rateLimit('chat', request, { limit: 10, windowMs: 60_000 })
 *   if (!result.ok) return Response.json({ error: 'Too many requests' }, { status: 429 })
 */

type RateLimitEntry = {
  count: number
  resetAt: number
}

// Separate maps per endpoint so limits don't interfere
const stores = new Map<string, Map<string, RateLimitEntry>>()

function getStore(endpoint: string): Map<string, RateLimitEntry> {
  if (!stores.has(endpoint)) {
    stores.set(endpoint, new Map())
  }
  return stores.get(endpoint)!
}

function getClientIp(request: Request): string {
  // Vercel forwards real IP in x-forwarded-for
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

type RateLimitOptions = {
  /** Max requests allowed in the window */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function rateLimit(
  endpoint: string,
  request: Request,
  options: RateLimitOptions
): RateLimitResult {
  const { limit, windowMs } = options
  const ip = getClientIp(request)
  const key = ip
  const now = Date.now()
  const store = getStore(endpoint)

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { ok: true, limit, remaining: limit - 1, resetAt }
  }

  if (entry.count >= limit) {
    return { ok: false, limit, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count += 1
  return { ok: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt }
}

/** Convenience: returns a 429 Response with Retry-After header */
export function rateLimitResponse(result: RateLimitResult): Response {
  const retryAfterSecs = Math.ceil((result.resetAt - Date.now()) / 1000)
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSecs),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAt),
      },
    }
  )
}
