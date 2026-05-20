// Phase 8.g.7 (2026-05-20) — SQL queries for /admin/insights.
//
// Reads from public.user_events + public.user_intent_profile (the Supabase
// mirror populated by lib/analytics.ts via /api/track-mirror). Because the
// Mixpanel free tier caps saved reports at ~10 per project, this dashboard
// hosts the full picture (30+ tiles) on our own DB.
//
// Pattern: each function takes a window-days parameter, runs ONE SQL query,
// returns typed rows. Page calls them in Promise.all to fetch in parallel.

import { getAdminClient } from '@/lib/cron/supabase-admin'

// The 10 RPCs in migration 096 aren't in the generated Supabase types yet,
// so we wrap rpc() in a loosely-typed helper. Each function inside still
// types its return shape via the consumer's cast — so the page side stays
// typed where it matters.
type RpcArgs = Record<string, unknown>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rpc(db: ReturnType<typeof getAdminClient>, fn: string, args: RpcArgs): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).rpc(fn, args)
}

export type DayWindow = 1 | 7 | 30 | 90

function cutoffIso(days: DayWindow): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

// Generic raw-SQL escape hatch since supabase-js doesn't expose .raw().
// Uses the rpc('exec_sql') pattern is overkill; instead we call .from()
// with .select() + chained filters when possible, and use jsonb operators
// only inside .or()/.filter() strings.
//
// For aggregations that need GROUP BY on jsonb keys, we fall back to a
// SECURITY DEFINER view. None of those are wired yet — keeping queries to
// what plain PostgREST supports.

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

// ── Acquisition ─────────────────────────────────────────────────────

export async function getOverviewMetrics(days: DayWindow): Promise<MetricResult[]> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)

  const [pageViews, uniqueVisitors, signups, newsletter] = await Promise.all([
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'page_viewed').gte('created_at', cutoff),
    rpc(db,'distinct_visitors_in_window', { p_cutoff: cutoff }).maybeSingle(),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'signup_completed').gte('created_at', cutoff),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'newsletter_subscribed').gte('created_at', cutoff),
  ])

  return [
    { label: 'Page views', value: pageViews.count ?? 0 },
    { label: 'Unique visitors', value: Number((uniqueVisitors.data as { count?: number } | null)?.count ?? 0) },
    { label: 'Signups', value: signups.count ?? 0 },
    { label: 'Newsletter subs', value: newsletter.count ?? 0 },
  ]
}

export async function getDailyActiveUsers(days: DayWindow): Promise<LinePoint[]> {
  const db = getAdminClient()
  // SQL via RPC because we need GROUP BY date.
  const { data } = await rpc(db,'insights_daily_active_users', { p_days: days })
  return ((data as Array<{ day: string; users: number }>) ?? []).map((r) => ({
    date: r.day,
    value: Number(r.users),
  }))
}

export async function getPageViewsByDevice(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_events_by_device', {
    p_event_name: 'page_viewed',
    p_days: days,
  })
  return ((data as Array<{ device_type: string; events: number }>) ?? []).map((r) => ({
    label: r.device_type ?? 'unknown',
    value: Number(r.events),
  }))
}

export async function getTopReferrers(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_top_property', {
    p_property: 'first_touch_referrer',
    p_days: days,
    p_limit: 10,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value ?? '(direct)',
    value: Number(r.events),
  }))
}

// ── Plan Funnel ─────────────────────────────────────────────────────

export async function getPlanFunnel(days: DayWindow): Promise<MetricResult[]> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const steps = ['plan_started', 'plan_intake_submitted', 'plan_completed', 'plan_results_tool_clicked']
  const results = await Promise.all(
    steps.map((step) =>
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', step).gte('created_at', cutoff),
    ),
  )
  return steps.map((step, i) => ({
    label: step.replace(/_/g, ' '),
    value: results[i].count ?? 0,
  }))
}

export async function getTopExistingTools(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_top_jsonb_property', {
    p_event_name: 'plan_existing_tool_added',
    p_property: 'tool_name',
    p_days: days,
    p_limit: 15,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopUseCases(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  // Pulls from user_intent_profile.plan_use_cases_submitted (text[])
  const { data } = await rpc(db,'insights_unnest_intent_array', {
    p_column: 'plan_use_cases_submitted',
    p_days: days,
    p_limit: 10,
  })
  return ((data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.users),
  }))
}

// ── Engagement ──────────────────────────────────────────────────────

export async function getEngagementMetrics(days: DayWindow): Promise<MetricResult[]> {
  const db = getAdminClient()
  const [today, week, month] = await Promise.all([
    rpc(db,'distinct_visitors_in_window', { p_cutoff: new Date(new Date().setHours(0, 0, 0, 0)).toISOString() }).maybeSingle(),
    rpc(db,'distinct_visitors_in_window', { p_cutoff: cutoffIso(7) }).maybeSingle(),
    rpc(db,'distinct_visitors_in_window', { p_cutoff: cutoffIso(30) }).maybeSingle(),
  ])
  void days
  return [
    { label: 'DAU (today)', value: Number((today.data as { count?: number } | null)?.count ?? 0) },
    { label: 'WAU (7d)', value: Number((week.data as { count?: number } | null)?.count ?? 0) },
    { label: 'MAU (30d)', value: Number((month.data as { count?: number } | null)?.count ?? 0) },
  ]
}

export async function getTopEvents(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_top_events', { p_days: days, p_limit: 20 })
  return ((data as Array<{ event_name: string; events: number }>) ?? []).map((r) => ({
    label: r.event_name,
    value: Number(r.events),
  }))
}

// ── Search ──────────────────────────────────────────────────────────

export async function getSearchMetrics(days: DayWindow): Promise<MetricResult[]> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const [submitted, zeroResults, clicked] = await Promise.all([
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'search_query_submitted').gte('created_at', cutoff),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'search_query_submitted').gte('created_at', cutoff)
      .filter('properties->>zero_results', 'eq', 'true'),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'search_result_clicked').gte('created_at', cutoff),
  ])
  const total = submitted.count ?? 0
  const zero = zeroResults.count ?? 0
  const clicks = clicked.count ?? 0
  return [
    { label: 'Searches', value: total },
    { label: 'Zero-result rate', value: total > 0 ? Math.round((zero / total) * 100) : 0 },
    { label: 'Clicks on results', value: clicks },
    { label: 'CTR %', value: total > 0 ? Math.round((clicks / total) * 100) : 0 },
  ]
}

export async function getTopSearches(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_top_jsonb_property', {
    p_event_name: 'search_query_submitted',
    p_property: 'query',
    p_days: days,
    p_limit: 15,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

// ── AI Chat ─────────────────────────────────────────────────────────

export async function getChatMetrics(days: DayWindow): Promise<MetricResult[]> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const [messages, uniqueUsers, toolClicks] = await Promise.all([
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'ai_chat_message').gte('created_at', cutoff),
    rpc(db,'distinct_visitors_for_event', { p_event_name: 'ai_chat_message', p_cutoff: cutoff }).maybeSingle(),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'ai_chat_tool_clicked').gte('created_at', cutoff),
  ])
  return [
    { label: 'Messages', value: messages.count ?? 0 },
    { label: 'Unique users', value: Number((uniqueUsers.data as { count?: number } | null)?.count ?? 0) },
    { label: 'Tool clicks', value: toolClicks.count ?? 0 },
  ]
}

export async function getTopChatTools(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_unnest_intent_array', {
    p_column: 'ai_chat_tools_mentioned',
    p_days: days,
    p_limit: 15,
  })
  return ((data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.users),
  }))
}

// ── Vendor Audience Snapshot ────────────────────────────────────────

export async function getTopViewedTools(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_top_jsonb_property', {
    p_event_name: 'tool_page_viewed',
    p_property: 'tool_slug',
    p_days: days,
    p_limit: 20,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopClickedTools(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_top_jsonb_property', {
    p_event_name: 'tool_visit_redirected',
    p_property: 'tool_slug',
    p_days: days,
    p_limit: 20,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopSavedTools(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_top_jsonb_property', {
    p_event_name: 'tool_saved',
    p_property: 'tool_slug',
    p_days: days,
    p_limit: 20,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopComparedTools(days: DayWindow): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db,'insights_unnest_intent_array', {
    p_column: 'tools_compared_with',
    p_days: days,
    p_limit: 15,
  })
  return ((data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.users),
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

export async function getToolAudienceDetail(slug: string, days: DayWindow): Promise<ToolAudienceDetail> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const [views, clicks, saves, comparedWith, uniqUsers] = await Promise.all([
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'tool_page_viewed').gte('created_at', cutoff)
      .filter('properties->>tool_slug', 'eq', slug),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'tool_visit_redirected').gte('created_at', cutoff)
      .filter('properties->>tool_slug', 'eq', slug),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('event_name', 'tool_saved').gte('created_at', cutoff)
      .filter('properties->>tool_slug', 'eq', slug),
    rpc(db,'insights_tool_compared_with', { p_slug: slug, p_days: days, p_limit: 10 }),
    rpc(db,'distinct_visitors_for_tool', { p_slug: slug, p_cutoff: cutoff }).maybeSingle(),
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
