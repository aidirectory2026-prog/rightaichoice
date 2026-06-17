/**
 * Rate limiter for Next.js API routes (Phase 10 #19).
 *
 * Backed by Postgres (shared across all serverless instances, survives cold
 * starts) via the rate_limit_check RPC — one atomic upsert per call. If the DB
 * is briefly unreachable we fall back to a per-instance in-memory window so a
 * limiter outage never hard-fails a request (fail-open on infra error only).
 *
 * Usage (now async):
 *   const result = await rateLimit('chat', request, { limit: 10, windowMs: 60_000 })
 *   if (!result.ok) return rateLimitResponse(result)
 */

import { getAdminClient } from '@/lib/cron/supabase-admin'

type RateLimitEntry = { count: number; resetAt: number }

// Per-instance fallback store, used only when the DB call fails.
const fallbackStores = new Map<string, Map<string, RateLimitEntry>>()
let lastCleanup = 0
const CLEANUP_INTERVAL = 60_000

function cleanupExpiredEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const store of fallbackStores.values()) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }
}

function getFallbackStore(endpoint: string): Map<string, RateLimitEntry> {
  if (!fallbackStores.has(endpoint)) fallbackStores.set(endpoint, new Map())
  return fallbackStores.get(endpoint)!
}

function getClientIp(request: Request): string {
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

function inMemory(endpoint: string, key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const store = getFallbackStore(endpoint)
  cleanupExpiredEntries()
  const entry = store.get(key)
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { ok: true, limit, remaining: limit - 1, resetAt }
  }
  if (entry.count >= limit) return { ok: false, limit, remaining: 0, resetAt: entry.resetAt }
  entry.count += 1
  return { ok: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt }
}

export async function rateLimit(
  endpoint: string,
  request: Request,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const { limit, windowMs } = options
  const ip = getClientIp(request)
  const key = `${endpoint}:${ip}`

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getAdminClient() as any
    const { data, error } = await admin.rpc('rate_limit_check', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    })
    if (error || !data) throw error ?? new Error('no_data')
    const count = Number(data.count ?? 0)
    const resetAt = data.reset_at ? new Date(data.reset_at).getTime() : Date.now() + windowMs
    return {
      ok: Boolean(data.ok),
      limit,
      remaining: Math.max(limit - count, 0),
      resetAt,
    }
  } catch {
    // DB unreachable — degrade to a per-instance window rather than 500.
    return inMemory(endpoint, ip, limit, windowMs)
  }
}

/**
 * H3 (Cowork QA) — GLOBAL daily budget for expensive LLM endpoints. Unlike
 * rateLimit (keyed per IP), this counts ALL callers against one shared key, so
 * IP rotation can't bypass it — a hard ceiling on total Anthropic/LLM spend per
 * day. Returns true while under budget. Fails OPEN on a DB error (a transient DB
 * blip must not take chat/plan/recommend down; the per-IP limit still applies).
 *
 * The cap is a daily CALL count (a simple, robust proxy for spend). Override with
 * env LLM_DAILY_CALL_CAP. Default 3000/day is far above current organic volume
 * but stops a runaway abuse loop.
 */
export async function underGlobalDailyLlmBudget(name = 'llm'): Promise<boolean> {
  const limit = Number(process.env.LLM_DAILY_CALL_CAP ?? 3000)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = getAdminClient() as any
    const { data, error } = await admin.rpc('rate_limit_check', {
      p_key: `global-daily:${name}`,
      p_limit: limit,
      p_window_ms: 86_400_000,
    })
    if (error || !data) return true // fail open on infra error
    return Boolean(data.ok)
  } catch {
    return true // fail open on infra error
  }
}

/** 503 response when the global LLM budget is exhausted. */
export function llmBudgetResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'AI is at capacity right now. Please try again later.' }),
    { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' } },
  )
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
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.resetAt),
      },
    },
  )
}
