// Phase 8.g.7 (2026-05-20) — SQL queries for /admin/insights.
// Phase 8.g.8 (2026-05-21) — threaded `includeBots` through every query
// so the dashboard defaults to human-only counts (bots excluded).
// Phase 10.4.7 (2026-06-12) — the functions powering the MAIN insights page
// now take a single `AdminFilters` (range + bots + the optional smart
// filters). RPCs receive `p_filters: filtersToJsonb(f)` (null when no
// optional filter is set → byte-identical pre-filter behavior); direct
// PostgREST selects get the applyFilters() mirror. Charts pinned to one
// event pass { dropEvent: true } so a global event filter doesn't AND with
// the pin and silently zero the tile. Functions NOT yet converted (the
// secondary tables + sub-pages) keep (sel, includeBots) until their
// Phase 5 rebuild.
//
// Reads from public.user_events + public.user_intent_profile (the Supabase
// mirror populated by lib/analytics.ts via /api/track-mirror). Because the
// Mixpanel free tier caps saved reports at ~10 per project, this dashboard
// hosts the full picture on our own DB.
//
// Pattern: each function takes its filters, runs ONE SQL query, returns
// typed rows. Page calls them in Promise.all.

import { getAdminClient } from '@/lib/cron/supabase-admin'
import type { RangeSelection } from '@/lib/admin/range'
import { applyFilters, filtersToJsonb, type AdminFilters } from '@/lib/admin/filters'
import { schemaPropKeys } from '@/lib/admin/event-props'
import { classifyChannel, hostFromReferrer } from '@/lib/analytics/channels'

// The 12 RPCs in migrations 096+098 aren't in the generated Supabase
// types yet, so wrap rpc() in a loosely-typed helper.
type RpcArgs = Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rpc(db: ReturnType<typeof getAdminClient>, fn: string, args: RpcArgs): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).rpc(fn, args)
}

// Apply a bot filter to a PostgREST .from() query — only call this on
// raw user_events selects (RPCs take the bot flag as an arg instead).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function maybeFilterBots<T>(q: T, includeBots: boolean): T {
  if (includeBots) return q
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (q as any).eq('bot_likely', false)
}

export type DayWindow = 1 | 7 | 30 | 90

function cutoffIso(days: DayWindow): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

// Phase 9 follow-up (2026-05-28) — IST-aligned "midnight today" cutoff.
// The founder runs admin from IST and "DAU today" should mean the IST
// calendar day, not the server-side UTC day. UTC midnight is 05:30 IST,
// so without this the "today" tile would silently miss every event that
// fired between IST midnight and IST 05:30.
function midnightIstIso(): string {
  const now = new Date()
  // Format the current instant as wall-clock parts in IST.
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const [{ value: day }, , { value: month }, , { value: year }] = fmt.formatToParts(now)
  // Convert IST midnight (YYYY-MM-DDT00:00:00+05:30) to UTC ISO so the
  // database comparison stays in the canonical timezone.
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`).toISOString()
}

export interface MetricResult {
  label: string
  value: number
}

export interface BarRow {
  label: string
  value: number
}

export interface LinePoint {
  date: string // YYYY-MM-DD
  value: number
}

export interface BotShare {
  total_events: number
  bot_events: number
  bot_pct: number
  total_visitors: number
  bot_visitors: number
  bot_visitor_pct: number
}

// ── Bot share (powers the "% bot traffic" metric tile) ─────────────

export async function getBotShare(f: AdminFilters): Promise<BotShare> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_bot_share',
    { p_days: sel.days, p_cutoff: sel.cutoffISO, p_end: sel.endCutoffISO, p_filters: filtersToJsonb(f) }).maybeSingle()
  const d = (data ?? {}) as Partial<BotShare>
  return {
    total_events: Number(d.total_events ?? 0),
    bot_events: Number(d.bot_events ?? 0),
    bot_pct: Number(d.bot_pct ?? 0),
    total_visitors: Number(d.total_visitors ?? 0),
    bot_visitors: Number(d.bot_visitors ?? 0),
    bot_visitor_pct: Number(d.bot_visitor_pct ?? 0),
  }
}

// ── Acquisition ─────────────────────────────────────────────────────

export async function getOverviewMetrics(f: AdminFilters): Promise<MetricResult[]> {
  const db = getAdminClient()
  const sel = f.range
  const includeBots = f.includeBots
  const cutoff = sel.cutoffISO
  // Event-pinned tiles drop a global `event` filter (the pin already scopes
  // them); the visitor-count RPCs are event-generic so they keep it.
  const pinned = { dropEvent: true }

  const [pageViews, uniqueVisitors, uniqueUsers, signups, newsletter] = await Promise.all([
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'page_viewed').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO),
      includeBots,
    ), f, pinned),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoff, p_end: sel.endCutoffISO, p_include_bots: includeBots, p_filters: filtersToJsonb(f) }).maybeSingle(),
    // Phase 9 (2026-05-28) — true distinct-human count (auth user_id).
    // Differs from "Unique visitors" (distinct_id), which counts each
    // browser / cookie-cleared session as a separate visitor.
    rpc(db, 'distinct_known_users_in_window', { p_cutoff: cutoff, p_end: sel.endCutoffISO, p_include_bots: includeBots, p_filters: filtersToJsonb(f) }).maybeSingle(),
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'signup_completed').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO),
      includeBots,
    ), f, pinned),
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'newsletter_subscribed').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO),
      includeBots,
    ), f, pinned),
  ])

  return [
    { label: 'Page views', value: pageViews.count ?? 0 },
    { label: 'Unique visitors', value: Number((uniqueVisitors.data as { count?: number } | null)?.count ?? 0) },
    { label: 'Signed-in accounts', value: Number((uniqueUsers.data as { count?: number } | null)?.count ?? 0) },
    { label: 'Signups', value: signups.count ?? 0 },
    { label: 'Newsletter subs', value: newsletter.count ?? 0 },
  ]
}

export async function getDailyActiveUsers(f: AdminFilters): Promise<LinePoint[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_daily_active_users',
    { p_days: sel.days, p_include_bots: f.includeBots, p_cutoff: sel.cutoffISO, p_end: sel.endCutoffISO, p_filters: filtersToJsonb(f) })
  return ((data as Array<{ day: string; users: number }>) ?? []).map((r) => ({
    date: r.day,
    value: Number(r.users),
  }))
}

export async function getPageViewsByDevice(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_events_by_device', {
    p_event_name: 'page_viewed',
    p_days: sel.days,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f, { dropEvent: true }), // pinned to page_viewed
  })
  return ((data as Array<{ device_type: string; events: number }>) ?? []).map((r) => ({
    label: r.device_type ?? 'unknown',
    value: Number(r.events),
  }))
}

export async function getTopReferrers(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_top_property', {
    p_property: 'first_touch_referrer',
    p_days: sel.days,
    p_limit: 10,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f),
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value ?? '(direct)',
    value: Number(r.events),
  }))
}

// ── Channels (10.7a) ────────────────────────────────────────────────
// Visitors by per-event channel classification (migrations 160+161 branch of
// insights_top_property reading properties->>'traffic_channel' — namespaced
// because `channel` is a real payload prop of share_clicked). Epoch-aware:
// rows before TRACKING_EPOCHS.channel have no traffic_channel key and come
// back as the '(unknown — pre-channel epoch)' bucket — shown, never hidden.
export async function getTopChannels(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_top_property', {
    p_property: 'traffic_channel',
    p_days: sel.days,
    p_limit: 10, // taxonomy has 9 channels + the epoch bucket
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f),
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

/** First-touch channel per visitor for a page of directory rows: one
 *  PostgREST select on user_intent_profile (≤50 ids), classified in TS via
 *  the same lib/analytics/channels.ts classifier the capture path uses.
 *  Prefers touch_history[0] (the recorded first touch) and falls back to
 *  classifying the first_touch_* columns; visitors with no profile row are
 *  simply absent from the map. */
export async function getFirstTouchChannels(
  distinctIds: string[],
): Promise<Map<string, { channel: string; source: string }>> {
  const out = new Map<string, { channel: string; source: string }>()
  if (distinctIds.length === 0) return out
  const db = getAdminClient()
  const { data } = await db
    .from('user_intent_profile')
    .select('distinct_id, first_touch_referrer, first_touch_utm_source, first_touch_utm_medium, touch_history')
    .in('distinct_id', distinctIds.slice(0, 100))
  for (const row of (data ?? []) as Array<{
    distinct_id: string
    first_touch_referrer: string | null
    first_touch_utm_source: string | null
    first_touch_utm_medium: string | null
    touch_history: Array<{ channel?: string; source?: string }> | null
  }>) {
    const first = Array.isArray(row.touch_history) ? row.touch_history[0] : undefined
    if (first && typeof first.channel === 'string' && first.channel) {
      out.set(row.distinct_id, { channel: first.channel, source: first.source ?? '' })
      continue
    }
    if (row.first_touch_referrer || row.first_touch_utm_source || row.first_touch_utm_medium) {
      const r = classifyChannel(
        hostFromReferrer(row.first_touch_referrer),
        row.first_touch_utm_medium,
        row.first_touch_utm_source,
      )
      out.set(row.distinct_id, { channel: r.channel, source: r.source })
    }
  }
  return out
}

// ── Plan Funnel ─────────────────────────────────────────────────────

export async function getPlanFunnel(f: AdminFilters): Promise<MetricResult[]> {
  const db = getAdminClient()
  const sel = f.range
  const cutoff = sel.cutoffISO
  const steps = ['plan_started', 'plan_intake_submitted', 'plan_completed', 'plan_results_tool_clicked']
  const results = await Promise.all(
    steps.map((step) =>
      applyFilters(maybeFilterBots(
        db.from('user_events').select('*', { count: 'exact', head: true })
          .eq('event_name', step).gte('created_at', cutoff).lt('created_at', sel.endCutoffISO),
        f.includeBots,
      ), f, { dropEvent: true }), // each step is event-pinned
    ),
  )
  return steps.map((step, i) => ({
    label: step.replace(/_/g, ' '),
    value: results[i].count ?? 0,
  }))
}

export async function getTopExistingTools(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'plan_existing_tool_added',
    p_property: 'tool_name',
    p_days: sel.days,
    p_limit: 15,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f, { dropEvent: true }), // event-pinned
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopUseCases(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  // user_intent_profile aggregate — p_filters restricts to visitors with at
  // least one matching user_events row (migration 154 §11 semantics).
  const { data } = await rpc(db, 'insights_unnest_intent_array', {
    p_column: 'plan_use_cases_submitted',
    p_days: sel.days,
    p_limit: 10,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f),
  })
  return ((data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.users),
  }))
}

// ── Engagement ──────────────────────────────────────────────────────

export async function getEngagementMetrics(sel: RangeSelection, includeBots: boolean): Promise<MetricResult[]> {
  const db = getAdminClient()
  const todayIso = midnightIstIso()
  const [today, week, month, todayKnown, weekKnown, monthKnown] = await Promise.all([
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: todayIso, p_include_bots: includeBots }).maybeSingle(),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoffIso(7), p_include_bots: includeBots }).maybeSingle(),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoffIso(30), p_include_bots: includeBots }).maybeSingle(),
    // Phase 9 (2026-05-28) — distinct logged-in humans for the same windows.
    rpc(db, 'distinct_known_users_in_window', { p_cutoff: todayIso, p_include_bots: includeBots }).maybeSingle(),
    rpc(db, 'distinct_known_users_in_window', { p_cutoff: cutoffIso(7), p_include_bots: includeBots }).maybeSingle(),
    rpc(db, 'distinct_known_users_in_window', { p_cutoff: cutoffIso(30), p_include_bots: includeBots }).maybeSingle(),
  ])
  void sel
  const num = (r: { data: unknown }) => Number((r.data as { count?: number } | null)?.count ?? 0)
  return [
    { label: 'DAU (today)', value: num(today) },
    { label: 'WAU (7d)', value: num(week) },
    { label: 'MAU (30d)', value: num(month) },
    { label: 'Signed-in accounts (today)', value: num(todayKnown) },
    { label: 'Signed-in accounts (7d)', value: num(weekKnown) },
    { label: 'Signed-in accounts (30d)', value: num(monthKnown) },
  ]
}

export async function getTopEvents(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_top_events', { p_days: sel.days, p_limit: 20,
    p_include_bots: f.includeBots, p_cutoff: sel.cutoffISO, p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f) })
  return ((data as Array<{ event_name: string; events: number }>) ?? []).map((r) => ({
    label: r.event_name,
    value: Number(r.events),
  }))
}

// ── Search ──────────────────────────────────────────────────────────

export async function getSearchMetrics(f: AdminFilters): Promise<MetricResult[]> {
  const db = getAdminClient()
  const sel = f.range
  const includeBots = f.includeBots
  const cutoff = sel.cutoffISO
  const pinned = { dropEvent: true } // every search metric is event-pinned
  const [submitted, zero, clicked] = await Promise.all([
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'search_query_submitted').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO),
      includeBots,
    ), f, pinned),
    rpc(db, 'insights_zero_result_rate', {
      p_cutoff: cutoff, p_end: sel.endCutoffISO, p_include_bots: includeBots, p_days: sel.days,
      p_filters: filtersToJsonb(f, pinned),
    }).maybeSingle(),
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'search_result_clicked').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO),
      includeBots,
    ), f, pinned),
  ])
  const total = submitted.count ?? 0
  const clicks = clicked.count ?? 0
  const zeroPct = Number((zero.data as { zero_result_pct?: number } | null)?.zero_result_pct ?? 0)
  return [
    { label: 'Searches', value: total },
    { label: 'Zero-result rate', value: zeroPct },
    { label: 'Clicks on results', value: clicks },
    { label: 'CTR %', value: total > 0 ? Math.round((clicks / total) * 100) : 0 },
  ]
}

export async function getTopSearches(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'search_query_submitted',
    p_property: 'query',
    p_days: sel.days,
    p_limit: 15,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f, { dropEvent: true }), // event-pinned
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

// ── AI Chat ─────────────────────────────────────────────────────────

export async function getChatMetrics(f: AdminFilters): Promise<MetricResult[]> {
  const db = getAdminClient()
  const sel = f.range
  const includeBots = f.includeBots
  const cutoff = sel.cutoffISO
  const pinned = { dropEvent: true } // every chat metric is event-pinned
  const [messages, uniqueUsers, toolClicks] = await Promise.all([
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'ai_chat_message').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO),
      includeBots,
    ), f, pinned),
    rpc(db, 'distinct_visitors_for_event', { p_event_name: 'ai_chat_message', p_cutoff: cutoff, p_end: sel.endCutoffISO, p_include_bots: includeBots, p_filters: filtersToJsonb(f, pinned) }).maybeSingle(),
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'ai_chat_tool_clicked').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO),
      includeBots,
    ), f, pinned),
  ])
  return [
    { label: 'Messages', value: messages.count ?? 0 },
    { label: 'Unique chatters', value: Number((uniqueUsers.data as { count?: number } | null)?.count ?? 0) },
    { label: 'Tool clicks', value: toolClicks.count ?? 0 },
  ]
}

export async function getTopChatTools(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  // user_intent_profile aggregate — p_filters per migration 154 §11.
  const { data } = await rpc(db, 'insights_unnest_intent_array', {
    p_column: 'ai_chat_tools_mentioned',
    p_days: sel.days,
    p_limit: 15,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f),
  })
  return ((data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.users),
  }))
}

// ── Vendor Audience Snapshot ────────────────────────────────────────

export async function getTopViewedTools(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'tool_page_viewed',
    p_property: 'tool_slug',
    p_days: sel.days,
    p_limit: 20,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f, { dropEvent: true }),
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopClickedTools(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'tool_visit_redirected',
    p_property: 'tool_slug',
    p_days: sel.days,
    p_limit: 20,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f, { dropEvent: true }),
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopSavedTools(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'tool_saved',
    p_property: 'tool_slug',
    p_days: sel.days,
    p_limit: 20,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f, { dropEvent: true }),
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopComparedTools(f: AdminFilters): Promise<BarRow[]> {
  const db = getAdminClient()
  const sel = f.range
  // user_intent_profile aggregate: p_filters restricts to visitors with at
  // least one matching user_events row (see migration 154 §11).
  const { data } = await rpc(db, 'insights_unnest_intent_array', {
    p_column: 'tools_compared_with',
    p_days: sel.days,
    p_limit: 15,
    p_include_bots: f.includeBots,
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f),
  })
  return ((data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.users),
  }))
}

// ── Tool engagement heatmap (Phase 10.5b — extracted from the page) ──

export interface ToolHeatmapRow {
  tool_slug: string
  tool_name: string | null
  views: number
  unique_visitors: number
  visit_clicks: number
  ctr_pct: number
  last_visit_at: string
}

export async function getToolHeatmap(f: AdminFilters, limit = 500): Promise<ToolHeatmapRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data, error } = await rpc(db, 'insights_tool_heatmap', {
    p_days: sel.days,
    p_include_bots: f.includeBots,
    p_limit: limit,
    // Window-pure since 149; the page previously passed p_days only —
    // explicit cutoffs make calendar-anchored ranges (today/mtd/custom)
    // honest instead of approximated by a rolling day count.
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f), // migration 157
  })
  if (error) throw new Error(`insights_tool_heatmap failed: ${error.message}`)
  return ((data as Array<ToolHeatmapRow & { views: number | string; unique_visitors: number | string; visit_clicks: number | string; ctr_pct: number | string }>) ?? []).map((r) => ({
    tool_slug: r.tool_slug,
    tool_name: r.tool_name,
    views: Number(r.views),
    unique_visitors: Number(r.unique_visitors),
    visit_clicks: Number(r.visit_clicks),
    ctr_pct: Number(r.ctr_pct),
    last_visit_at: r.last_visit_at,
  }))
}

// ── Per-tool drill-down ─────────────────────────────────────────────

export interface ToolAudienceDetail {
  slug: string
  views: number
  click_outs: number
  saves: number
  compared_with: BarRow[]
  unique_users: number
}

export async function getToolAudienceDetail(slug: string, f: AdminFilters): Promise<ToolAudienceDetail> {
  const db = getAdminClient()
  const sel = f.range
  const includeBots = f.includeBots
  const cutoff = sel.cutoffISO
  const pinned = { dropEvent: true } // every count leg is event-pinned
  const [views, clicks, saves, comparedWith, uniqUsers] = await Promise.all([
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'tool_page_viewed').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO)
        .filter('properties->>tool_slug', 'eq', slug),
      includeBots,
    ), f, pinned),
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'tool_visit_redirected').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO)
        .filter('properties->>tool_slug', 'eq', slug),
      includeBots,
    ), f, pinned),
    applyFilters(maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'tool_saved').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO)
        .filter('properties->>tool_slug', 'eq', slug),
      includeBots,
    ), f, pinned),
    // Profile aggregate — p_filters per migration 154 §11 (added in 157).
    rpc(db, 'insights_tool_compared_with', { p_slug: slug, p_days: sel.days, p_limit: 10,
      p_include_bots: includeBots, p_cutoff: sel.cutoffISO, p_end: sel.endCutoffISO,
      p_filters: filtersToJsonb(f) }),
    rpc(db, 'distinct_visitors_for_tool', { p_slug: slug, p_cutoff: cutoff, p_end: sel.endCutoffISO,
      p_include_bots: includeBots, p_filters: filtersToJsonb(f) }).maybeSingle(),
  ])
  return {
    slug,
    views: views.count ?? 0,
    click_outs: clicks.count ?? 0,
    saves: saves.count ?? 0,
    compared_with: ((comparedWith.data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
      label: r.value,
      value: Number(r.users),
    })),
    unique_users: Number((uniqUsers.data as { count?: number } | null)?.count ?? 0),
  }
}

// ── Raw event viewer + per-user timeline ────────────────────────────

export interface RawEventRow {
  id: string
  created_at: string
  event_name: string
  distinct_id: string
  user_id: string | null
  auth_state: string | null
  source_kind: string
  device_type: string | null
  page_path: string | null
  referrer: string | null
  properties: Record<string, unknown>
  ip: string | null
  user_agent: string | null
  bot_likely: boolean
}

// Phase 10.5b.2 — getRawEvents now takes the full AdminFilters (range +
// bots + every optional smart filter via the applyFilters() mirror) instead
// of the old (days, includeBots) pair; an explicit eventName pin drops a
// global event filter (same value anyway when set from the explorer URL).
export interface RawEventsQuery {
  filters: AdminFilters
  eventName?: string
  distinctId?: string
  page: number
  pageSize: number
}

export async function getRawEvents(f: RawEventsQuery): Promise<{ rows: RawEventRow[]; total: number }> {
  const db = getAdminClient()
  const sel = f.filters.range
  let q = applyFilters(
    maybeFilterBots(
      db.from('user_events')
        .select('id,created_at,event_name,distinct_id,user_id,auth_state,source_kind,device_type,page_path,referrer,properties,ip,user_agent,bot_likely', { count: 'exact' })
        .gte('created_at', sel.cutoffISO)
        .lt('created_at', sel.endCutoffISO),
      f.filters.includeBots,
    ),
    f.filters,
    { dropEvent: !!f.eventName },
  )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }) // deterministic within equal timestamps
    .range(f.page * f.pageSize, f.page * f.pageSize + f.pageSize - 1)

  if (f.eventName) q = q.eq('event_name', f.eventName)
  if (f.distinctId) q = q.eq('distinct_id', f.distinctId)

  const { data, count } = await q
  return {
    rows: (data ?? []) as unknown as RawEventRow[],
    total: count ?? 0,
  }
}

// ── Events explorer (Phase 10.5b.2) ────────────────────────────────
// Per-event window volume with the always-visible bot split + per-IST-day
// spark series (RPC insights_event_volume_list, migration 157), and the
// schema-allowlisted property breakdown (insights_event_property_breakdown).

export interface EventVolumeRow {
  event_name: string
  events: number
  bot_events: number
  visitors: number
  last_fired: string | null
  spark: LinePoint[]
}

export async function getEventVolumeList(f: AdminFilters): Promise<EventVolumeRow[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data, error } = await rpc(db, 'insights_event_volume_list', {
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_include_bots: f.includeBots,
    // The list IS the event picker — a global event filter must not
    // collapse it to one row, so it is deliberately dropped here.
    p_filters: filtersToJsonb(f, { dropEvent: true }),
  })
  if (error) throw new Error(`insights_event_volume_list failed: ${error.message}`)
  return ((data as Array<{
    event_name: string
    events: number | string
    bot_events: number | string
    visitors: number | string
    last_fired: string | null
    spark: Array<{ date: string; value: number }> | null
  }>) ?? []).map((r) => ({
    event_name: r.event_name,
    events: Number(r.events),
    bot_events: Number(r.bot_events),
    visitors: Number(r.visitors),
    last_fired: r.last_fired,
    spark: (r.spark ?? []).map((p) => ({ date: p.date, value: Number(p.value) })),
  }))
}

export interface EventPropertyBreakdownRow {
  value: string
  events: number
  visitors: number
}

export async function getEventPropertyBreakdown(
  event: string,
  prop: string,
  f: AdminFilters,
  limit = 12,
): Promise<EventPropertyBreakdownRow[]> {
  // THE allowlist: only properties the event's schema declares may be
  // queried (lib/admin/event-props.ts derives them from EVENT_SCHEMAS).
  const allowed = schemaPropKeys(event)
  if (!allowed.includes(prop)) {
    throw new Error(`property "${prop}" is not in the ${event} schema — breakdown refused`)
  }
  const db = getAdminClient()
  const sel = f.range
  const { data, error } = await rpc(db, 'insights_event_property_breakdown', {
    p_event: event,
    p_prop: prop,
    p_filters: filtersToJsonb(f, { dropEvent: true }), // pinned to p_event
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_limit: limit,
    p_include_bots: f.includeBots,
  })
  if (error) throw new Error(`insights_event_property_breakdown failed: ${error.message}`)
  return ((data as Array<{ value: string; events: number | string; visitors: number | string }>) ?? []).map((r) => ({
    value: r.value,
    events: Number(r.events),
    visitors: Number(r.visitors),
  }))
}

export async function getEventsForDistinctId(distinctId: string, limit = 200): Promise<RawEventRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_recent_events_for_distinct_id', {
    p_distinct_id: distinctId,
    p_limit: limit,
  })
  return (data ?? []) as RawEventRow[]
}

// ── Sessions (Phase 8.g.10) ────────────────────────────────────────

export interface UserSession {
  session_num: number
  started_at: string
  ended_at: string
  duration_sec: number
  event_count: number
  entry_page: string | null
  exit_page: string | null
  pages_visited: number
  event_types: string[]
  country: string | null
  city: string | null
  region: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  device_type: string | null
  clarity_session_id: string | null
}

export async function getUserSessions(distinctId: string, limit = 50): Promise<UserSession[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_user_sessions', {
    p_distinct_id: distinctId,
    p_limit: limit,
  })
  return (data ?? []) as UserSession[]
}

// ── User profile (header on the timeline page) ─────────────────────

export interface UserProfile {
  distinct_id: string
  user_id: string | null
  email_domain: string | null
  first_seen_at: string
  last_active_at: string
  signup_at: string | null
  existing_tools_history: string[] | null
  ai_chat_tools_mentioned: string[] | null
  tools_visited_externally: string[] | null
  tools_compared_with: string[] | null
  plan_use_cases_submitted: string[] | null
  reviews_submitted_for: string[] | null
  all_search_queries_recent: string[] | null
  saves_count: number | null
  comparisons_count: number | null
  plans_completed_count: number | null
  reviews_count: number | null
  searches_count: number | null
  tools_visited_count: number | null
  chat_messages_count: number | null
  plan_budget_segment: string | null
  plan_team_segment: string | null
  plan_industry_segment: string | null
  plan_skill_segment: string | null
}

export async function getUserProfile(distinctId: string): Promise<UserProfile | null> {
  const db = getAdminClient()
  const { data } = await db
    .from('user_intent_profile')
    .select('*')
    .eq('distinct_id', distinctId)
    .maybeSingle()
  return (data ?? null) as UserProfile | null
}

// ── User 360 v2 (Phase 10.6) ───────────────────────────────────────
// insights_user_profile_v2 + insights_user_sessions_v2 (migration 158).
// Point lookups by distinct_id — not part of the pinned snapshot surface.

export interface UserProfileV2 {
  distinct_id: string
  user_id: string | null
  username: string | null
  email_domain: string | null
  // Full identity — admin-only, joined from auth.users in the RPC (migration
  // 159). EXECUTE on the function is service_role/postgres only (never
  // anon/authenticated), so the real email is safe to return here. email is the
  // full address (not just the domain); full_name + auth_provider tell you WHO
  // signed up and HOW (google / email / …).
  email: string | null
  full_name: string | null
  auth_provider: string | null
  is_authed: boolean
  first_seen_at: string | null
  last_seen_at: string | null
  lifetime_events: number
  events_30d: number
  bot_events: number
  session_count: number
  is_returning: boolean
  first_touch_referrer: string | null
  first_touch_landing: string | null
  first_touch_utm_source: string | null
  first_touch_utm_medium: string | null
  first_touch_utm_campaign: string | null
  top_countries: Array<{ value: string; events: number }>
  top_devices: Array<{ value: string; events: number }>
  last_clarity_session_id: string | null
  // Reconstructed Clarity player deep-link for the user's most recent recorded
  // session (clarity.microsoft.com/player/<project>/<userId>/<sessionId>). Null
  // until Clarity records a session for them post-deploy.
  last_clarity_playback_url: string | null
}

export async function getUserProfileV2(distinctId: string): Promise<UserProfileV2 | null> {
  const db = getAdminClient()
  const { data, error } = await rpc(db, 'insights_user_profile_v2', {
    p_distinct_id: distinctId,
  })
  if (error) throw new Error(`insights_user_profile_v2 failed: ${error.message}`)
  const row = ((data ?? []) as Array<Record<string, unknown>>)[0]
  if (!row) return null
  return {
    ...(row as unknown as UserProfileV2),
    lifetime_events: Number(row.lifetime_events ?? 0),
    events_30d: Number(row.events_30d ?? 0),
    bot_events: Number(row.bot_events ?? 0),
    session_count: Number(row.session_count ?? 0),
    top_countries: (row.top_countries ?? []) as Array<{ value: string; events: number }>,
    top_devices: (row.top_devices ?? []) as Array<{ value: string; events: number }>,
  }
}

export interface SessionEventRow {
  id: string
  created_at: string
  event_name: string
  page_path: string | null
  device_type: string | null
  auth_state: string | null
  source_kind: string
  bot_likely: boolean
  properties: Record<string, unknown> | null
}

export interface UserSessionV2 {
  session_key: string
  /** How this session was grouped: real per-tab id vs 30-min-gap fallback. */
  method: 'session_id' | 'gap'
  started_at: string
  ended_at: string
  duration_sec: number
  event_count: number
  /** Ordered page flow (consecutive duplicates collapsed). */
  pages: string[]
  /** Key-action counts (tool_visit_* / plan_* / sentiment_* / …). */
  key_actions: Record<string, number>
  entry_page: string | null
  exit_page: string | null
  device_type: string | null
  country: string | null
  city: string | null
  region: string | null
  referrer: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  clarity_session_id: string | null
  /** Full event payload, ascending, capped at p_events_cap per session. */
  events: SessionEventRow[]
  events_truncated: boolean
}

export async function getUserSessionsV2(
  distinctId: string,
  limit = 50,
  eventsCap = 500,
): Promise<UserSessionV2[]> {
  const db = getAdminClient()
  const { data, error } = await rpc(db, 'insights_user_sessions_v2', {
    p_distinct_id: distinctId,
    p_limit: limit,
    p_events_cap: eventsCap,
  })
  if (error) throw new Error(`insights_user_sessions_v2 failed: ${error.message}`)
  return ((data ?? []) as UserSessionV2[]).map((s) => ({
    ...s,
    pages: s.pages ?? [],
    key_actions: s.key_actions ?? {},
    events: s.events ?? [],
  }))
}

// Cross-links: the user's actual content rows (reviews / saved tools /
// plan intents), so the 360 page links out to what they did — not just
// what they fired.

export interface UserContentLinks {
  reviews: Array<{ tool_slug: string; tool_name: string; rating: number; created_at: string }>
  savedTools: Array<{ tool_slug: string; tool_name: string; created_at: string }>
  planIntents: Array<{ id: string; typed_goal: string | null; source_surface: string | null; created_at: string }>
}

export async function getUserContentLinks(
  distinctId: string,
  userId: string | null,
): Promise<UserContentLinks> {
  const db = getAdminClient()
  type ToolJoin = { slug: string; name: string } | Array<{ slug: string; name: string }> | null
  const firstTool = (t: ToolJoin) => (Array.isArray(t) ? t[0] : t) ?? null

  const [reviewsRes, savedRes, intentsRes] = await Promise.all([
    userId
      ? db.from('reviews').select('rating,created_at,tools(slug,name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
    userId
      ? db.from('user_saved_tools').select('created_at,tools(slug,name)').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [] }),
    (userId
      ? db.from('plan_intents').select('id,typed_goal,source_surface,created_at').or(`distinct_id.eq."${distinctId}",user_id.eq.${userId}`)
      : db.from('plan_intents').select('id,typed_goal,source_surface,created_at').eq('distinct_id', distinctId)
    ).order('created_at', { ascending: false }).limit(20),
  ])

  const reviews = ((reviewsRes.data ?? []) as Array<{ rating: number; created_at: string; tools: ToolJoin }>)
    .map((r) => {
      const t = firstTool(r.tools)
      return t ? { tool_slug: t.slug, tool_name: t.name, rating: r.rating, created_at: r.created_at } : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  const savedTools = ((savedRes.data ?? []) as Array<{ created_at: string; tools: ToolJoin }>)
    .map((r) => {
      const t = firstTool(r.tools)
      return t ? { tool_slug: t.slug, tool_name: t.name, created_at: r.created_at } : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  const planIntents = ((intentsRes.data ?? []) as UserContentLinks['planIntents'])

  return { reviews, savedTools, planIntents }
}

// ── KPI goals + event health (Phase 8.g.9) ─────────────────────────

export interface KpiGoal {
  kpi_key: string
  display_name: string
  category: string
  goal_value: number
  unit: string
  description: string | null
}

export interface KpiRow extends KpiGoal {
  current_value: number
  pct_of_goal: number
}

export async function getKpiRows(): Promise<KpiRow[]> {
  const db = getAdminClient()
  const [goals, values] = await Promise.all([
    db.from('insights_goals').select('*').order('category'),
    rpc(db, 'insights_kpi_values', { p_days: 7 }),
  ])
  const valueByKey = new Map<string, number>()
  for (const v of ((values.data as Array<{ kpi_key: string; current_value: number }>) ?? [])) {
    valueByKey.set(v.kpi_key, Number(v.current_value))
  }
  return ((goals.data as KpiGoal[]) ?? []).map((g) => {
    const current = Number(valueByKey.get(g.kpi_key) ?? 0)
    const pct = g.goal_value > 0 ? Math.round((current / Number(g.goal_value)) * 1000) / 10 : 0
    return {
      ...g,
      goal_value: Number(g.goal_value),
      current_value: current,
      pct_of_goal: pct,
    }
  })
}

export interface EventHealthRow {
  event_name: string
  last_fire: string | null
  fires_24h: number
  fires_7d: number
  fires_30d: number
  total_in_window: number
  pct_device_type: number
  pct_page_path: number
  pct_auth_state: number
}

export interface VolumeProjection {
  today_events: number
  mtd_events: number
  rolling_30d_avg: number
  days_in_month: number
  day_of_month: number
  projected_month_end: number
  free_tier_cap: number
  pct_of_cap: number
}

export async function getVolumeProjection(): Promise<VolumeProjection | null> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_event_volume_projection', {}).maybeSingle()
  if (!data) return null
  const r = data as Partial<VolumeProjection>
  return {
    today_events: Number(r.today_events ?? 0),
    mtd_events: Number(r.mtd_events ?? 0),
    rolling_30d_avg: Number(r.rolling_30d_avg ?? 0),
    days_in_month: Number(r.days_in_month ?? 30),
    day_of_month: Number(r.day_of_month ?? 1),
    projected_month_end: Number(r.projected_month_end ?? 0),
    free_tier_cap: Number(r.free_tier_cap ?? 20_000_000),
    pct_of_cap: Number(r.pct_of_cap ?? 0),
  }
}

export async function getEventHealth(days: 7 | 30 | 90 = 30): Promise<{
  fired: EventHealthRow[]
  deadEventNames: string[]
  freshnessPct: number
}> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_event_health', { p_days: days })
  const rows = ((data as Array<{
    event_name: string
    last_fire: string | null
    fires_24h: number
    fires_7d: number
    fires_30d: number
    total_in_window: number
    pct_device_type: number
    pct_page_path: number
    pct_auth_state: number
  }>) ?? []).map((r) => ({
    ...r,
    fires_24h: Number(r.fires_24h),
    fires_7d: Number(r.fires_7d),
    fires_30d: Number(r.fires_30d),
    total_in_window: Number(r.total_in_window),
    pct_device_type: Number(r.pct_device_type),
    pct_page_path: Number(r.pct_page_path),
    pct_auth_state: Number(r.pct_auth_state),
  }))
  // Import the catalog to detect dead events. Lazy-load to avoid circular.
  const { EVENTS } = await import('@/scripts/mixpanel/config/events')
  const fired7d = new Set(rows.filter((r) => r.fires_7d > 0).map((r) => r.event_name))
  const allCatalogNames = EVENTS.map((e: { name: string }) => e.name)
  const deadEventNames = allCatalogNames.filter((n: string) => !fired7d.has(n))
  const freshnessPct = allCatalogNames.length > 0
    ? Math.round((fired7d.size / allCatalogNames.length) * 1000) / 10
    : 0
  return { fired: rows, deadEventNames, freshnessPct }
}

// ── Reconciliation: explainer numbers for Mixpanel-vs-admin delta ──

export interface ReconciliationStats {
  days: number
  client_events: number
  server_events: number
  bot_events: number
  unique_distinct_ids: number
  unique_distinct_ids_no_bots: number
  ad_block_ratio_estimate: number // not measurable directly — see notes
}

// ── Returning visitors ──────────────────────────────────────────────
// Phase 9 (2026-05-28) — "returning users" panel. Splits the in-window
// active visitors into new (first_seen inside window) vs returning
// (first_seen before window), plus a per-visitor leaderboard.

export type ReturningSummary = {
  total: number
  new_count: number
  returning_count: number
  returning_pct: number
  avg_days_between: number | null
}

export type RecentVisitor = {
  distinct_id: string
  user_id: string | null
  first_seen: string
  last_seen: string
  total_events: number
  active_days: number
  is_returning: boolean
}

export async function getReturningSummary(f: AdminFilters): Promise<ReturningSummary> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_returning_visitors', {
    p_cutoff: sel.cutoffISO, p_include_bots: f.includeBots, p_end: sel.endCutoffISO, p_days: sel.days,
    p_filters: filtersToJsonb(f),
  }).maybeSingle()
  const d = (data ?? {}) as Partial<{
    total_visitors: number
    new_visitors: number
    returning_visitors: number
    returning_pct: number
    avg_days_between: number | null
  }>
  return {
    total: Number(d.total_visitors ?? 0),
    new_count: Number(d.new_visitors ?? 0),
    returning_count: Number(d.returning_visitors ?? 0),
    returning_pct: Number(d.returning_pct ?? 0),
    avg_days_between: d.avg_days_between == null ? null : Number(d.avg_days_between),
  }
}

export async function getRecentVisitors(limit: number, f: AdminFilters): Promise<RecentVisitor[]> {
  const db = getAdminClient()
  const sel = f.range
  const { data } = await rpc(db, 'insights_recent_visitors', {
    p_limit: limit,
    p_include_bots: f.includeBots,
    p_window_start: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_filters: filtersToJsonb(f),
  })
  return ((data as Array<{
    distinct_id: string
    user_id: string | null
    first_seen: string
    last_seen: string
    total_events: number | string
    active_days: number
    is_returning: boolean
  }>) ?? []).map((r) => ({
    distinct_id: r.distinct_id,
    user_id: r.user_id,
    first_seen: r.first_seen,
    last_seen: r.last_seen,
    total_events: Number(r.total_events),
    active_days: Number(r.active_days),
    is_returning: !!r.is_returning,
  }))
}

// ── Users directory (Phase 10.5a.3) ────────────────────────────────
// One row per visitor active in the window, via insights_user_directory
// (migration 155): window-scoped stats + lifetime-based New/Returning
// split, server-side sort (allowlisted) + pagination with an exact total.

export type UserDirectorySort = 'last_seen' | 'events' | 'first_seen'

export const USER_DIRECTORY_SORTS: readonly UserDirectorySort[] = [
  'last_seen',
  'events',
  'first_seen',
] as const

export interface UserDirectoryRow {
  distinct_id: string
  user_id: string | null
  first_seen: string
  last_seen: string
  events_in_window: number
  active_days: number
  top_country: string | null
  top_device: string | null
  is_returning: boolean
  // Identity (admin-only, joined from auth.users in the RPC — migration 159).
  // Null for anonymous visitors (no linked user_id).
  email: string | null
  full_name: string | null
  auth_provider: string | null
}

export async function getUserDirectory(
  f: AdminFilters,
  opts: { sort: UserDirectorySort; page: number; pageSize?: number },
): Promise<{ rows: UserDirectoryRow[]; total: number }> {
  const db = getAdminClient()
  const sel = f.range
  const pageSize = opts.pageSize ?? 50
  const { data, error } = await rpc(db, 'insights_user_directory', {
    p_cutoff: sel.cutoffISO,
    p_end: sel.endCutoffISO,
    p_include_bots: f.includeBots,
    p_filters: filtersToJsonb(f),
    p_sort: opts.sort,
    p_limit: pageSize,
    p_offset: Math.max(0, opts.page) * pageSize,
  })
  if (error) throw new Error(`insights_user_directory failed: ${error.message}`)
  const rows = ((data as Array<UserDirectoryRow & { total_rows: number | string }>) ?? [])
  return {
    rows: rows.map((r) => ({
      distinct_id: r.distinct_id,
      user_id: r.user_id,
      first_seen: r.first_seen,
      last_seen: r.last_seen,
      events_in_window: Number(r.events_in_window),
      active_days: Number(r.active_days),
      top_country: r.top_country,
      top_device: r.top_device,
      is_returning: !!r.is_returning,
      email: r.email ?? null,
      full_name: r.full_name ?? null,
      auth_provider: r.auth_provider ?? null,
    })),
    total: Number(rows[0]?.total_rows ?? 0),
  }
}

// ── Filter-bar options (Phase 10.4.7) ──────────────────────────────
// Country dropdown options for the global filter bar — distinct countries
// seen in the last 90 days, busiest first. Event options come from the
// schema registry (SCHEMA_EVENT_NAMES) instead, so they can never drift
// from the FIRED set.

export async function getCountryFilterOptions(): Promise<string[]> {
  // P0 hotfix (2026-06-12): _admin_audit_exec returns a single jsonb value,
  // NOT an array of rows — the old `.map` threw and 500'd every page that
  // renders the filter bar. Aggregate to a real JSON array in SQL, and never
  // let a dropdown-options helper take a page down: degrade to [].
  try {
    const db = getAdminClient()
    const { data } = await rpc(db, '_admin_audit_exec', {
      p_sql: `select coalesce(json_agg(country), '[]'::json) from (
                select country from user_events
                where country is not null and country <> ''
                  and created_at >= now() - interval '90 days'
                group by 1 order by count(*) desc limit 40
              ) t`,
    })
    if (!Array.isArray(data)) return []
    return data.filter((c): c is string => typeof c === 'string' && c.length > 0)
  } catch {
    return []
  }
}

// Phase 10.5b — AdminFilters conversion. NOTE: the bot semantics here are
// the METRIC (client/server/bot splits + with/without-bot visitor counts),
// so f.includeBots is deliberately ignored; optional filters + range apply.
export async function getReconciliationStats(f: AdminFilters): Promise<ReconciliationStats> {
  const db = getAdminClient()
  const sel = f.range
  const cutoff = sel.cutoffISO
  const [client, server, bots, allUniq, humanUniq] = await Promise.all([
    applyFilters(db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('source_kind', 'client').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO), f),
    applyFilters(db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('source_kind', 'server').gte('created_at', cutoff).lt('created_at', sel.endCutoffISO), f),
    applyFilters(db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('bot_likely', true).gte('created_at', cutoff).lt('created_at', sel.endCutoffISO), f),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoff, p_end: sel.endCutoffISO, p_include_bots: true, p_filters: filtersToJsonb(f) }).maybeSingle(),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoff, p_end: sel.endCutoffISO, p_include_bots: false, p_filters: filtersToJsonb(f) }).maybeSingle(),
  ])
  return {
    days: sel.days,
    client_events: client.count ?? 0,
    server_events: server.count ?? 0,
    bot_events: bots.count ?? 0,
    unique_distinct_ids: Number((allUniq.data as { count?: number } | null)?.count ?? 0),
    unique_distinct_ids_no_bots: Number((humanUniq.data as { count?: number } | null)?.count ?? 0),
    ad_block_ratio_estimate: 0.3, // industry baseline 25-35% on tech audiences
  }
}
