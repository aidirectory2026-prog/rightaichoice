// Phase 13 Social — shared publisher helpers (pure + thin HTTP).

import type { SocialAccount } from '../types'
import type { PublishResult } from './types'

/** A platform is usable only if its account isn't paused (meta.paused). The admin
 *  pause switch lets the founder stop a platform without disconnecting it. */
export function notPaused(account: SocialAccount | null): boolean {
  return (account?.meta as { paused?: boolean } | undefined)?.paused !== true
}

/** 5xx and 429 are worth retrying; 4xx (auth/validation) are not. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600)
}

export function fail(error: string, retryable = false): PublishResult {
  return { ok: false, error, retryable }
}

/** A token is usable if present and not past expiry (with a 5-min safety margin
 *  to absorb cron/network jitter — a token expiring mid-publish causes a hard 401). */
export function tokenUsable(accessToken: string | null, expiresAt: string | null): boolean {
  if (!accessToken) return false
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() - 300_000 > Date.now()
}

/** Hard final guard: never exceed a platform's char limit at post time. */
export function clamp(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

/** POST JSON with an auth header + a bounded timeout. */
export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  timeoutMs = 20_000,
): Promise<{ status: number; json: any; text: string; headers: Record<string, string> }> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ac.signal,
    })
    const text = await res.text()
    let json: any = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      /* non-JSON body */
    }
    const hdrs: Record<string, string> = {}
    res.headers.forEach((v, k) => {
      hdrs[k.toLowerCase()] = v
    })
    return { status: res.status, json, text, headers: hdrs }
  } finally {
    clearTimeout(timer)
  }
}
