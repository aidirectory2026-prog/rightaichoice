/**
 * BUG-17 (Phase 13) — ONE admin gate, replacing ~14 hand-rolled copies that
 * had drifted apart (different status codes, error strings, and one that read a
 * non-existent `role` column). Every gate now runs the SAME check:
 *   1. a signed-in user (else 401 / "Not signed in")
 *   2. profiles.is_admin = true for that user (else 403 / "Not admin")
 *
 * Three thin wrappers preserve each call site's existing RESPONSE SHAPE so the
 * migration is behaviour-preserving:
 *   • checkAdmin()        → { ok, status, reason }  (API routes that build their own NextResponse)
 *   • requireAdmin()      → { userId }, THROWS on failure (server actions)
 *   • All read the SSR session via @/lib/supabase/server createClient().
 */

import { createClient } from '@/lib/supabase/server'

export type AdminGate =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; reason: string }

/** Canonical check. 401 when not signed in, 403 when signed in but not admin. */
export async function checkAdmin(): Promise<AdminGate> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, reason: 'Not signed in' }
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return { ok: false, status: 403, reason: 'Not admin' }
  }
  return { ok: true, userId: user.id }
}

/**
 * Server-action variant: returns the admin's userId or THROWS. Distinct
 * messages preserve the prior behaviour (not-signed-in vs not-authorized) that
 * the action wrappers surface as error toasts.
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const gate = await checkAdmin()
  if (!gate.ok) {
    throw new Error(gate.status === 401 ? 'Not authenticated' : 'Not authorized')
  }
  return { userId: gate.userId }
}
