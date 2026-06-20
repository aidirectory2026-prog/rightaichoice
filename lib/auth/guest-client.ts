'use client'

import { createClient } from '@/lib/supabase/client'

// Phase 11 (2026-06-21): "Continue as guest" — a REAL Supabase anonymous session,
// not a no-op skip. The guest gets a genuine account (a profile row with a
// `guest_…` handle) so anything they save (stacks, scans) persists and can later
// be upgraded to a full Google/email account without losing it.

/** Same-origin path guard (mirrors oauth-client.safeNextPath). */
function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/dashboard'
  return next
}

/**
 * Start an anonymous session, then land on `next` (or the dashboard). On failure
 * (e.g. anonymous sign-ins not enabled on the project) bounce to /login with a hint.
 */
export async function continueAsGuest(next?: string | null): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.error('Guest sign-in failed:', error.message)
    window.location.href = '/login?error=guest_failed'
    return
  }
  window.location.href = safeNextPath(next)
}
