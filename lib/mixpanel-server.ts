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

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
const UPSTREAM = process.env.MIXPANEL_DATA_API_HOST || 'https://api-eu.mixpanel.com'

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
    return trackServer({
      event: 'signup_completed',
      distinctId,
      ip,
      properties: { method, source: 'server' },
    })
  },
  loginCompleted(distinctId: string, method: string, ip?: string) {
    return trackServer({
      event: 'login_completed',
      distinctId,
      ip,
      properties: { method, source: 'server' },
    })
  },
  reviewSubmitted(distinctId: string, toolId: string, rating: number, ip?: string) {
    return trackServer({
      event: 'review_submitted',
      distinctId,
      ip,
      properties: { tool_id: toolId, rating, source: 'server' },
    })
  },
  toolVisitRedirected(distinctId: string, toolSlug: string, referrerPath: string, ip?: string) {
    // Fires from the server-side /api/tools/[slug]/visit affiliate redirect
    // handler — this is the authoritative revenue event. Client also fires
    // tool_visit_clicked; Mixpanel de-dupes via $insert_id on the server call.
    return trackServer({
      event: 'tool_visit_redirected',
      distinctId,
      ip,
      properties: { tool_slug: toolSlug, referrer_path: referrerPath, source: 'server' },
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
