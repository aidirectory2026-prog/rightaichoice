import { createHmac, timingSafeEqual } from 'crypto'

// Phase 10 #34 — signed, tamper-proof unsubscribe tokens.
//
// Email "unsubscribe" links embed signUnsubscribeToken(email); the route
// verifies the HMAC so a caller cannot unsubscribe an arbitrary address by
// guessing emails. Falls back to CRON_SECRET if a dedicated secret is unset
// so the feature is never silently keyless in any environment.

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || ''
  return s
}

export function signUnsubscribeToken(email: string): string {
  const normalized = email.toLowerCase().trim()
  const sig = createHmac('sha256', secret()).update(normalized).digest('hex')
  return Buffer.from(`${normalized}:${sig}`).toString('base64url')
}

/** Returns the verified email, or null if the token is missing/forged. */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!token || !secret()) return null
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const idx = decoded.lastIndexOf(':')
    if (idx <= 0) return null
    const email = decoded.slice(0, idx)
    const provided = decoded.slice(idx + 1)
    const expected = createHmac('sha256', secret()).update(email).digest('hex')
    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    return email
  } catch {
    return null
  }
}
