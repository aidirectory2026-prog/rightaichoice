'use client'

import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Phase 7 Step 58 (BUG-019): builds an auth-page URL that preserves the
 * caller's current path as `?next=`, so users land back where they were
 * after signing in / signing up instead of bouncing to /dashboard.
 *
 * Mirrors the navbar's inline `authHref()` (which this hook also replaces).
 * One source of truth — every "Sign in to X" CTA in the app should use
 * this hook so the redirect-back contract holds everywhere.
 *
 * Skips wrapping on routes where `?next=` is meaningless or harmful:
 *   - `/`               (homepage; no destination to remember)
 *   - `/login*`         (avoid self-loops)
 *   - `/signup*`        (avoid self-loops)
 *   - `/dashboard*`     (post-auth landing — `next=/dashboard` is a no-op)
 *
 * Server-side guard: every `?next=` consumer (server actions + the
 * /auth/callback and /auth/confirm route handlers) runs the value through
 * `safeNext()` from `lib/auth/safe-next.ts`. That guard rejects
 * protocol-relative or absolute URLs even if a malicious client sends one.
 * This hook only generates the safe shape; the server enforces it.
 */
export function useAuthHref(target: '/login' | '/signup'): string {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const search = searchParams.toString()
  const current = pathname + (search ? `?${search}` : '')

  if (
    !current ||
    current === '/' ||
    current.startsWith('/login') ||
    current.startsWith('/signup') ||
    current.startsWith('/dashboard')
  ) {
    return target
  }

  return `${target}?next=${encodeURIComponent(current)}`
}
