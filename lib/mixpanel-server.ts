/**
 * Server-side Mixpanel tracking via the /track HTTP API (free tier friendly —
 * ingestion endpoints don't require a paid plan).
 *
 * Why we have this: ad-blockers and privacy extensions kill 20–40% of
 * client-side events. Revenue-critical events (signup, affiliate click,
 * review) fire from the server as the source of truth. Client-side firing
 * still happens too — Mixpanel de-dupes via $insert_id.
 *
 * The client-side equivalent lives in lib/analytics.ts. Keep both in sync.
 */

import crypto from 'node:crypto'
import { getAdminClient } from '@/lib/cron/supabase-admin'

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
const UPSTREAM = process.env.MIXPANEL_DATA_API_HOST || 'https://api-eu.mixpanel.com'

// Fire-and-forget mirror into public.user_events so server-side events
// (signup_completed, login_completed, tool_visit_redirected, …) land in
// the same table as client events. Without this, /admin/insights only
// counts the client half and our funnel maths is broken.
async function mirrorServerEvent(args: {
  event: string
  distinctId: string
  userId?: string | null
  properties?: ServerEventProperties
  ip?: string | null
  pagePath?: string | null
  insertId?: string
}): Promise<void> {
  try {
    const db = getAdminClient()
    await db.from('user_events').upsert(
      [{
        distinct_id: args.distinctId,
        user_id: args.userId ?? null,
        auth_state: args.userId ? 'known' : 'anon',
        event_name: args.event,
        properties: (args.properties ?? {}) as Record<string, unknown>,
        page_path: args.pagePath ?? null,
        source_kind: 'server',
        ip: args.ip ?? null,
        bot_likely: false,
        insert_id: args.insertId ?? crypto.randomUUID(),
        created_at: new Date().toISOString(),
      }] as never,
      { onConflict: 'insert_id', ignoreDuplicates: true },
    )
  } catch {
    // Mirror failures must never break the auth/redirect flow.
  }
}

type ServerEventProperties = Record<
  string,
  string | number | boolean | null | undefined | string[]
>

type TrackArgs = {
  event: string
  distinctId: string
  properties?: ServerEventProperties
  /** Pass when the event fires from a user action so Mixpanel geo-attribution works. */
  ip?: string
  /** Override event time (epoch ms). Defaults to now. */
  time?: number
  /** Unique id for de-duplication. Generated if omitted. */
  insertId?: string
}

/**
 * Fire one server-side event. Returns false if tracking is disabled (no
 * token) or the upstream call fails — callers should not await this in a
 * hot path or let it throw.
 */
export async function trackServer(args: TrackArgs): Promise<boolean> {
  if (!TOKEN) return false

  const payload = {
    event: args.event,
    properties: {
      token: TOKEN,
      distinct_id: args.distinctId,
      time: Math.floor((args.time ?? Date.now()) / 1000),
      $insert_id: args.insertId ?? crypto.randomUUID(),
      source: 'server',
      ...(args.ip ? { ip: args.ip } : {}),
      ...(args.properties ?? {}),
    },
  }

  try {
    const body = new URLSearchParams({ data: Buffer.from(JSON.stringify(payload)).toString('base64') })
    const res = await fetch(`${UPSTREAM}/track?verbose=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body,
    })
    if (!res.ok) return false
    const json = (await res.json()) as { status?: number }
    return json.status === 1
  } catch {
    return false
  }
}

/**
 * Strongly-typed surface for server-side events. Mirrors the revenue-critical
 * subset of lib/analytics.ts. Add a method here only when the event MUST fire
 * authoritatively from the server.
 */
export const serverAnalytics = {
  signupCompleted(distinctId: string, method: string, ip?: string) {
    // 9.A.1 #5 — signup fires once per user; key the id on the user so OAuth
    // callback retries / prefetch don't create duplicate user_events rows.
    const insertId = deterministicInsertId('signup_completed', distinctId, 'once')
    void mirrorServerEvent({
      event: 'signup_completed',
      distinctId,
      userId: distinctId,
      ip,
      insertId,
      properties: { method, source: 'server' },
    })
    return trackServer({
      event: 'signup_completed',
      distinctId,
      ip,
      insertId,
      properties: { method, source: 'server' },
    })
  },
  loginCompleted(distinctId: string, method: string, ip?: string) {
    // 9.A.1 #5 — collapse retries within a UTC day (login granularity is daily).
    const insertId = deterministicInsertId('login_completed', distinctId, utcDayKey())
    void mirrorServerEvent({
      event: 'login_completed',
      distinctId,
      userId: distinctId,
      ip,
      insertId,
      properties: { method, source: 'server' },
    })
    return trackServer({
      event: 'login_completed',
      distinctId,
      ip,
      insertId,
      properties: { method, source: 'server' },
    })
  },
  reviewSubmitted(distinctId: string, toolId: string, rating: number, ip?: string) {
    // 9.A.1 #5 — one review per user per tool; key on user+tool.
    return trackServer({
      event: 'review_submitted',
      distinctId,
      ip,
      insertId: deterministicInsertId('review_submitted', distinctId, toolId),
      properties: { tool_id: toolId, rating, source: 'server' },
    })
  },
  toolVisitRedirected(distinctId: string, toolSlug: string, referrerPath: string, ip?: string) {
    // Fires from the server-side /api/tools/[slug]/visit affiliate redirect
    // handler — this is the authoritative revenue event. Client also fires
    // tool_visit_clicked; Mixpanel de-dupes via $insert_id on the server call.
    // 9.A.1 #5 — per-minute key collapses accidental double-fires / retries
    // (prefetch already filtered upstream) while still counting genuine repeat
    // clicks in later minutes. Same id for the mirror + Mixpanel call.
    const insertId = deterministicInsertId('tool_visit_redirected', distinctId, `${toolSlug}|${utcMinuteKey()}`)
    const props = { tool_slug: toolSlug, referrer_path: referrerPath, source: 'server' }
    void mirrorServerEvent({
      event: 'tool_visit_redirected',
      distinctId,
      ip,
      pagePath: referrerPath,
      insertId,
      properties: props,
    })
    return trackServer({
      event: 'tool_visit_redirected',
      distinctId,
      ip,
      insertId,
      properties: props,
    })
  },
  activationMilestoneServer(distinctId: string, milestone: string, ip?: string) {
    return trackServer({
      event: 'activation_milestone',
      distinctId,
      ip,
      properties: { milestone, source: 'server' },
    })
  },

  // ── Phase 8.g.3 — new server-side mirrors ──────────────────────
  // Pattern for client/server pairs: deterministicInsertId() so the same
  // logical event fired from both sides de-dups in Mixpanel within its
  // 5-day insert_id window.

  planCompletedServer(distinctId: string, useCase: string, toolCount: number, recommendedSlugs: string[], ip?: string) {
    return trackServer({
      event: 'plan_completed',
      distinctId,
      ip,
      insertId: deterministicInsertId('plan_completed', distinctId, useCase),
      properties: {
        use_case: useCase.slice(0, 200),
        tool_count: toolCount,
        recommended_tool_slugs: recommendedSlugs.slice(0, 30),
        source: 'server',
      },
    })
  },

  recommendationRequestedServer(distinctId: string, useCase: string, budget: string, skillLevel: string, resultSlugs: string[], ip?: string) {
    return trackServer({
      event: 'recommendation_requested',
      distinctId,
      ip,
      insertId: deterministicInsertId('recommendation_requested', distinctId, useCase + budget + skillLevel),
      properties: {
        use_case: useCase.slice(0, 200),
        budget,
        skill_level: skillLevel,
        result_count: resultSlugs.length,
        result_tool_slugs: resultSlugs.slice(0, 30),
        source: 'server',
      },
    })
  },

  toolSavedServer(distinctId: string, toolId: string, toolSlug: string, ip?: string) {
    return trackServer({
      event: 'tool_saved',
      distinctId,
      ip,
      insertId: deterministicInsertId('tool_saved', distinctId, toolId),
      properties: { tool_id: toolId, tool_slug: toolSlug, source: 'server' },
    })
  },

  passwordResetCompletedServer(distinctId: string, ip?: string) {
    return trackServer({
      event: 'password_reset_completed',
      distinctId,
      ip,
      properties: { method: 'email', source: 'server' },
    })
  },

  newsletterSubscribedServer(distinctId: string, emailDomain: string, source: string, pagePath: string, ip?: string) {
    return trackServer({
      event: 'newsletter_subscribed',
      distinctId,
      ip,
      insertId: deterministicInsertId('newsletter_subscribed', distinctId, emailDomain),
      properties: {
        email_domain: emailDomain,
        source,
        page_path_at_subscribe: pagePath,
        source_kind: 'server',
      },
    })
  },
}

// ── Internal: deterministic insert_id for client/server de-dup ────
// Hash collapses event name + distinct_id + payload signature into one stable
// id. The client fires the same event with the same signature → both land
// with the same $insert_id → Mixpanel keeps exactly one within its 5-day
// dedup window. SHA-256 truncated to 16 bytes (32 hex chars) is plenty for
// uniqueness at our scale.
function deterministicInsertId(event: string, distinctId: string, payloadSignature: string): string {
  return crypto
    .createHash('sha256')
    .update(`${event}|${distinctId}|${payloadSignature}`)
    .digest('hex')
    .slice(0, 32)
}

// 9.A.1 #5 — bucket helpers for deterministic ids on the revenue events.
// UTC day for login (collapses retries within a calendar day), UTC minute for
// affiliate redirects (collapses rapid double-fires / OAuth-style retries while
// still counting genuine separate clicks in later minutes).
function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}
function utcMinuteKey(): string {
  return new Date().toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
}
