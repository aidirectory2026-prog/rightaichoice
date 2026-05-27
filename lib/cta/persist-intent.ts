/**
 * Phase 9 — Client helper for the Plan-Your-Stack CTA flow.
 *
 * Two entry points:
 *   1. persistPlanIntent — POSTs the typed goal to /api/plan/intent. Used
 *      by the modal "Skip" branch (sends signup_outcome='skipped'), the
 *      OAuth-completed branch (signup_outcome='completed_google'|'linkedin'),
 *      and the post-OAuth restore-from-sessionStorage flow.
 *   2. linkPlanIntentsToUser — POSTs to /api/plan/intent/link after auth
 *      to reconcile every anon plan_intents row for this distinct_id with
 *      the now-known user_id. One human → one continuous history.
 *
 * Both are fire-and-forget — they swallow errors so the user-facing
 * navigation is never blocked by a failed persist call.
 */

import { analytics, getMixpanelDistinctId } from '@/lib/analytics'

type Surface = 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage'
type Outcome = 'completed_google' | 'completed_linkedin' | 'skipped' | 'unknown'

const SESSION_KEY = 'plan_intent_pending'

type PendingIntent = {
  typed_goal: string
  source_surface: Surface
}

/**
 * Stash the goal in sessionStorage before redirecting away for OAuth.
 * After the round-trip, restorePendingIntent() picks it up and POSTs.
 */
export function stashPendingIntent(typed_goal: string, source_surface: Surface): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ typed_goal, source_surface }))
  } catch {
    /* quota/private mode — ignore */
  }
}

export function readPendingIntent(): PendingIntent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingIntent
  } catch {
    return null
  }
}

export function clearPendingIntent(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * POST the typed goal to /api/plan/intent. Idempotent at the request level
 * (the server inserts a new row each time; callers should only call once
 * per CTA cycle). Always resolves; never throws to the caller.
 */
export async function persistPlanIntent(opts: {
  typed_goal: string
  source_surface: Surface
  signup_outcome: Outcome
}): Promise<void> {
  if (typeof window === 'undefined') return
  const distinctId = getMixpanelDistinctId() ?? ''
  if (!distinctId || !opts.typed_goal.trim()) return
  try {
    await fetch('/api/plan/intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        distinct_id: distinctId,
        typed_goal: opts.typed_goal,
        source_surface: opts.source_surface,
        signup_outcome: opts.signup_outcome,
      }),
      keepalive: true, // survive unload navigations (Skip→/plan redirect)
    })
    analytics.planIntentPersisted({
      source_surface: opts.source_surface,
      char_count: opts.typed_goal.length,
    })
  } catch {
    /* fire-and-forget */
  }
}

/**
 * Called once after identify() in auth-provider on anon→known transition.
 * Stitches every pre-auth plan_intents row to the user_id.
 */
export async function linkPlanIntentsToUser(): Promise<void> {
  if (typeof window === 'undefined') return
  const distinctId = getMixpanelDistinctId() ?? ''
  if (!distinctId) return
  try {
    const res = await fetch('/api/plan/intent/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ distinct_id: distinctId }),
    })
    if (!res.ok) return
    const json = (await res.json()) as { ok?: boolean; count_linked?: number }
    if (json.ok && typeof json.count_linked === 'number' && json.count_linked > 0) {
      analytics.planIntentLinkedToUser({
        user_id: '', // server already knows; we pass empty so client doesn't leak
        count_linked: json.count_linked,
      })
    }
  } catch {
    /* fire-and-forget */
  }
}
