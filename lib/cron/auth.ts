import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

// P3 (Cowork QA): constant-time comparison so the cron token can't be recovered
// byte-by-byte via response-timing. Length check first (timingSafeEqual throws on
// unequal lengths) — that only leaks the length, not the contents.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export function validateCronSecret(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  const secret = process.env.CRON_SECRET

  if (!secret || !token || !safeEqual(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
