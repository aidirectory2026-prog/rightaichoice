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
}
