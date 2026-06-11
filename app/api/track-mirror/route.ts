// Phase 8.h (2026-05-20) — Supabase mirror of all captured analytics events.
//
// Endpoint that lib/analytics.ts pings (in batch) alongside Mixpanel. Writes
// every event to public.user_events and updates the per-user behavioural
// record (public.user_intent_profile) via the upsert_user_intent RPC.
//
// Why this exists: Mixpanel free tier blocks the Query API, so programmatic
// export of event data isn't possible without paying. This endpoint stores
// the same data in OUR database where we have unlimited SQL access — the
// salable per-user record lives here, not in Mixpanel.
//
// Privacy: same rules as the rest of the stack — never log passwords or
// payment data; truncate free-text properties at the call site. Email is
// reduced to email_domain only on every event.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { isLikelyBotUA } from '@/lib/bot-detection'

// Phase 9 follow-up (2026-05-28) — short retry for transient Supabase 5xx /
// network blips. Three attempts, exponential backoff capped at 600ms total,
// so the route stays well under Vercel's function timeout but survives the
// kind of pool-saturation hiccups that took the site down today.
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  baseMs: number = 100,
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseMs * Math.pow(2, i)))
      }
    }
  }
  throw lastErr
}

// ── Bot detection ──────────────────────────────────────────────────
// Phase 9.A.10 — bot detection now lives in lib/bot-detection (imported above)
// as the single source of truth. Previously a regex lived here AND a looser
// one in app/api/views; they disagreed on what counted as a "bot", so
// view_count and user_events.bot_likely classified traffic differently.

// One client event payload, exactly as sent from lib/analytics.ts.
type MirrorEvent = {
  event_name: string
  distinct_id: string
  user_id?: string | null
  auth_state?: 'anon' | 'known'
  properties?: Record<string, unknown>
  page_path?: string
  referrer?: string
  device_type?: 'mobile' | 'tablet' | 'desktop'
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  first_touch_utm_source?: string
  first_touch_referrer?: string
  first_touch_landing?: string
  insert_id?: string
  client_time_ms?: number
}

// ── Profile-update routing ──────────────────────────────────────
// For each event, decide which arrays / counters / segments to push into
// user_intent_profile. Returns the args to pass to the upsert_user_intent RPC.
function profileUpdatesFor(e: MirrorEvent): Record<string, unknown> {
  const props = (e.properties ?? {}) as Record<string, unknown>
  const updates: Record<string, unknown> = {}
  const arr = (key: string): string[] | undefined => {
    const v = props[key]
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string').slice(0, 50)
    if (typeof v === 'string' && v.length > 0) return [v]
    return undefined
  }
  const str = (key: string): string | undefined => {
    const v = props[key]
    return typeof v === 'string' && v.length > 0 ? v : undefined
  }
  switch (e.event_name) {
    case 'plan_intake_submitted': {
      const segs = {
        p_plan_budget: str('budget'),
        p_plan_team: str('team_size'),
        p_plan_industry: str('industry'),
        p_plan_skill: str('skill_level'),
      }
      Object.assign(updates, segs, {
        p_arr_existing_tools: arr('existing_tools'),
        p_arr_plan_use_cases: arr('goal_text'),
        p_inc_plans_completed: 0, // counted on plan_completed
      })
      break
    }
    case 'plan_existing_tool_added':
      updates.p_arr_existing_tools = arr('tool_name')
      break
    case 'plan_completed':
      updates.p_inc_plans_completed = 1
      updates.p_arr_plan_use_cases = arr('use_case')
      break
    case 'plan_results_displayed':
      updates.p_arr_plan_use_cases = arr('use_case')
      break
    case 'search_query_submitted':
      updates.p_inc_searches = 1
      updates.p_arr_search_queries = arr('query')
      break
    case 'search_result_clicked':
      updates.p_arr_search_queries = arr('query')
      break
    case 'tool_saved':
      updates.p_inc_saves = 1
      break
    case 'tool_visit_redirected':
      // 9.A.1 #4 — count the visit ONCE. tool_visit_clicked (client) and
      // tool_visit_redirected (server) both fire for a single "Visit website"
      // click, so incrementing on both double-counted tools_visited in the
      // per-user profile. We keep only the server-authoritative redirect
      // (also bot/prefetch-filtered at source in 9.0.2).
      updates.p_inc_tools_visited = 1
      updates.p_arr_tools_visited = arr('tool_slug')
      break
    case 'comparison_viewed': {
      const tools = arr('tools')
      if (tools && tools.length >= 2) {
        const sorted = [...tools].sort()
        const pair = `${sorted[0]}-vs-${sorted[1]}`
        updates.p_arr_tools_compared = [pair]
      }
      updates.p_inc_comparisons = 1
      break
    }
    case 'review_submitted':
      updates.p_inc_reviews = 1
      updates.p_arr_reviews_for = arr('tool_slug')
      break
    case 'ai_chat_message':
      updates.p_inc_chat_messages = 1
      updates.p_arr_chat_tools = arr('mentioned_tool_slugs')
      break
    case 'newsletter_subscribed':
      // email_domain is set as a top-level column; no array-update here
      break
    case 'signup_completed': {
      const sa = str('signup_at')
      if (sa) updates.p_signup_at = sa
      break
    }
  }
  return updates
}

export async function POST(req: NextRequest) {
  let body: { events?: MirrorEvent[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }
  const events = (body.events ?? []).slice(0, 100) // hard cap per batch
  if (events.length === 0) {
    return NextResponse.json({ ok: true, written: 0 })
  }

  const db = getAdminClient()

  // Phase 9 (2026-05-28) — resolve user_id from the auth cookie server-side.
  // Previously every row landed with user_id=null because the client never
  // included it in the payload (and the admin client we use for the insert
  // can't see auth context). Reading it here from the SSR client is the
  // single source of truth: if the browser has a valid Supabase session,
  // EVERY event in this batch is stamped with the correct auth user_id —
  // anon batches stay null. This is what makes the new "Unique users"
  // admin metric count real humans (distinct user_id) instead of always
  // returning 0.
  let serverUserId: string | null = null
  try {
    const ssClient = await createClient()
    const { data } = await ssClient.auth.getUser()
    serverUserId = data.user?.id ?? null
  } catch {
    /* anon — keep null */
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 300)
  // Phase 10.2 (F7): regex + stale-Chrome + dev-build heuristics (recall fix)
  const botLikely = isLikelyBotUA(ua)
  // Phase 8.g.10 — Vercel auto-populates these on every edge request.
  // Free, no third-party geo lookup needed.
  const country = req.headers.get('x-vercel-ip-country') ?? null
  const city = req.headers.get('x-vercel-ip-city') ? decodeURIComponent(req.headers.get('x-vercel-ip-city')!) : null
  const region = req.headers.get('x-vercel-ip-country-region') ?? null

  // ── Insert all events in one shot ────────────────────────────
  const rows = events.map((e) => {
    const props = (e.properties ?? {}) as Record<string, unknown>
    // Clarity session ID rides along inside event properties; lift it to
    // a column for fast filter + JOIN to the replay deep-link.
    const claritySid = typeof props.clarity_session_id === 'string' ? props.clarity_session_id : null
    // Attribution-fix (2026-06-10) — persist first-touch referrer/landing in
    // properties (JSONB): user_events has no dedicated columns for them, and
    // without this they were silently dropped, leaving first_touch_utm_source
    // as the only retro-queryable first-touch signal.
    if (typeof e.first_touch_referrer === 'string' && e.first_touch_referrer && props.first_touch_referrer === undefined) {
      props.first_touch_referrer = e.first_touch_referrer.slice(0, 400)
    }
    if (typeof e.first_touch_landing === 'string' && e.first_touch_landing && props.first_touch_landing === undefined) {
      props.first_touch_landing = e.first_touch_landing.slice(0, 400)
    }
    // navigator.webdriver=true (Playwright/Puppeteer/Selenium) marks the whole
    // row as bot even when the UA regex misses — stealth-headless browsers
    // ship stock Chrome UAs.
    const rowBotLikely = botLikely || props.webdriver === true
    // user_id is STRICTLY server-resolved from the auth cookie. Never
    // trust whatever the client put in the payload — otherwise a hostile
    // client could spoof events as any user and inflate the unique-users
    // metric. If the cookie is missing/expired the event lands as anon.
    return {
      distinct_id: e.distinct_id,
      user_id: serverUserId,
      auth_state: serverUserId ? 'known' : 'anon',
      event_name: e.event_name,
      properties: props,
      page_path: e.page_path ?? null,
      referrer: e.referrer ?? null,
      device_type: e.device_type ?? null,
      source_kind: 'client',
      utm_source: e.utm_source ?? null,
      utm_medium: e.utm_medium ?? null,
      utm_campaign: e.utm_campaign ?? null,
      first_touch_utm_source: e.first_touch_utm_source ?? null,
      ip,
      user_agent: ua,
      country,
      city,
      region,
      clarity_session_id: claritySid,
      insert_id: e.insert_id ?? null,
      bot_likely: rowBotLikely,
      created_at: e.client_time_ms ? new Date(e.client_time_ms).toISOString() : new Date().toISOString(),
    }
  })

  // Use onConflict: 'insert_id' to dedup retried beacons. Wrapped in
  // withRetry so a transient Supabase 5xx doesn't drop the whole batch —
  // the client's holding pen will re-flush on next attempt anyway, but
  // recovering inside this request is much faster.
  try {
    await withRetry(async () => {
      const { error } = await db
        .from('user_events')
        .upsert(rows as never, { onConflict: 'insert_id', ignoreDuplicates: true })
      if (error) throw new Error(error.message)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[track-mirror] user_events insert failed after retry:', message)
    // 503 (not 500) signals the client to KEEP the batch in its holding
    // pen and replay on the next flush instead of treating it as a
    // permanent failure.
    return NextResponse.json({ error: message }, { status: 503 })
  }

  // ── Update user_intent_profile per event ─────────────────────
  // Sequential because each event may union arrays into the same row.
  // Volume is small (max 100 per batch), so the round-trip cost is fine.
  for (const e of events) {
    const updates = profileUpdatesFor(e)
    if (Object.keys(updates).length === 0 && !serverUserId) {
      // Even with no profile updates, still upsert the bare distinct_id row
      // so we count this user as "seen" — but skip if no value to add.
      continue
    }
    const args: Record<string, unknown> = {
      p_distinct_id: e.distinct_id,
      p_user_id: serverUserId,
      p_page_path: e.page_path ?? null,
      p_first_touch_utm_source: e.first_touch_utm_source ?? null,
      p_first_touch_utm_medium: null,
      p_first_touch_utm_campaign: null,
      p_first_touch_referrer: e.first_touch_referrer ?? null,
      p_first_touch_landing: e.first_touch_landing ?? null,
      ...updates,
    }
    // Pull email_domain from newsletter_subscribed payload.
    if (e.event_name === 'newsletter_subscribed') {
      const ed = (e.properties as Record<string, unknown> | undefined)?.email_domain
      if (typeof ed === 'string') args.p_email_domain = ed
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcErr } = await (db as any).rpc('upsert_user_intent', args)
    if (rpcErr) {
      console.warn(`[track-mirror] upsert_user_intent for ${e.event_name} failed:`, rpcErr.message)
      // Never fail the batch — events are already written.
    }
  }

  return NextResponse.json({ ok: true, written: events.length })
}
