/**
 * Phase 9 — POST /api/plan/intent
 *
 * Durable capture of every typed goal from the Plan-Your-Stack CTA flow.
 * Called from lib/cta/persist-intent.ts at two moments:
 *   1. User clicks "Skip & continue" in the signup modal → typed goal saved
 *      with user_id=null and signup_outcome='skipped'.
 *   2. User completes OAuth signup → typed goal saved with user_id present
 *      and signup_outcome='completed_google|completed_linkedin'.
 *
 * Fire-and-forget from the client's POV (we never block the redirect to
 * /plan), so latency budget is generous but errors must be swallowed.
 */
import { NextResponse } from 'next/server'
import { headers as nextHeaders } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PostBody = {
  distinct_id?: string
  typed_goal?: string
  source_surface?: string
  signup_outcome?: string | null
  /** Original CTA-click page. Explicitly passed so it survives OAuth
   *  redirects (where Referer becomes the callback URL, not the original
   *  page). When absent, falls back to the Referer header. */
  source_path?: string | null
}

const VALID_SURFACES = new Set(['sticky_bar', 'inline_card', 'navbar', 'homepage'])
const VALID_OUTCOMES = new Set(['completed_google', 'completed_linkedin', 'skipped', 'unknown'])

/** PII scrubber — mirrors the policy from use-debounced-text-tracking.ts. */
function sanitizeText(input: string): string {
  return input
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\b\d{9,}\b/g, '[number]')
    .slice(0, 500)
}

export async function POST(req: Request) {
  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const distinctId = typeof body.distinct_id === 'string' ? body.distinct_id.slice(0, 200) : ''
  const rawGoal = typeof body.typed_goal === 'string' ? body.typed_goal : ''
  const surface = typeof body.source_surface === 'string' ? body.source_surface : ''
  const outcomeRaw = typeof body.signup_outcome === 'string' ? body.signup_outcome : null

  if (!distinctId) return NextResponse.json({ ok: false, error: 'missing_distinct_id' }, { status: 400 })
  if (!rawGoal.trim()) return NextResponse.json({ ok: false, error: 'empty_goal' }, { status: 400 })
  if (!VALID_SURFACES.has(surface)) {
    return NextResponse.json({ ok: false, error: 'invalid_surface' }, { status: 400 })
  }
  const outcome = outcomeRaw && VALID_OUTCOMES.has(outcomeRaw) ? outcomeRaw : null

  const cleanGoal = sanitizeText(rawGoal)
  const charCount = cleanGoal.length

  // Pull request context
  const h = await nextHeaders()
  const referer = h.get('referer') ?? null
  const userAgent = h.get('user-agent')?.slice(0, 400) ?? null
  const country = h.get('x-vercel-ip-country') ?? null

  // Source path priority:
  //   1. body.source_path explicitly passed by the client (always-correct
  //      for both Skip and post-OAuth paths)
  //   2. Referer header pathname (fallback for older clients / direct curl)
  let sourcePath: string | null = null
  const explicit = typeof body.source_path === 'string' ? body.source_path.trim() : ''
  if (explicit && explicit.startsWith('/')) {
    sourcePath = explicit.slice(0, 200)
  } else if (referer) {
    try {
      sourcePath = new URL(referer).pathname.slice(0, 200)
    } catch {
      /* keep null */
    }
  }

  // Bind to logged-in user when session present.
  let userId: string | null = null
  try {
    const ssClient = await createClient()
    const { data } = await ssClient.auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    /* anonymous */
  }

  // Service-role insert (RLS denies the anon path; this route is the only
  // sanctioned write surface).
  const admin = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('plan_intents') as any).insert({
    distinct_id: distinctId,
    user_id: userId,
    typed_goal: cleanGoal,
    char_count: charCount,
    source_surface: surface,
    source_path: sourcePath,
    signup_outcome: outcome,
    referrer: referer ? referer.slice(0, 400) : null,
    user_agent: userAgent,
    country,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, char_count: charCount })
}
