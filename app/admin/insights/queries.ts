// Phase 8.g.7 (2026-05-20) — SQL queries for /admin/insights.
// Phase 8.g.8 (2026-05-21) — threaded `includeBots` through every query
// so the dashboard defaults to human-only counts (bots excluded).
//
// Reads from public.user_events + public.user_intent_profile (the Supabase
// mirror populated by lib/analytics.ts via /api/track-mirror). Because the
// Mixpanel free tier caps saved reports at ~10 per project, this dashboard
// hosts the full picture on our own DB.
//
// Pattern: each function takes a window-days parameter + includeBots flag,
// runs ONE SQL query, returns typed rows. Page calls them in Promise.all.

import { getAdminClient } from '@/lib/cron/supabase-admin'

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

export async function getBotShare(days: DayWindow): Promise<BotShare> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_bot_share', { p_days: days }).maybeSingle()
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

export async function getOverviewMetrics(days: DayWindow, includeBots: boolean): Promise<MetricResult[]> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)

  const [pageViews, uniqueVisitors, signups, newsletter] = await Promise.all([
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'page_viewed').gte('created_at', cutoff),
      includeBots,
    ),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoff, p_include_bots: includeBots }).maybeSingle(),
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'signup_completed').gte('created_at', cutoff),
      includeBots,
    ),
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'newsletter_subscribed').gte('created_at', cutoff),
      includeBots,
    ),
  ])

  return [
    { label: 'Page views', value: pageViews.count ?? 0 },
    { label: 'Unique visitors', value: Number((uniqueVisitors.data as { count?: number } | null)?.count ?? 0) },
    { label: 'Signups', value: signups.count ?? 0 },
    { label: 'Newsletter subs', value: newsletter.count ?? 0 },
  ]
}

export async function getDailyActiveUsers(days: DayWindow, includeBots: boolean): Promise<LinePoint[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_daily_active_users', { p_days: days, p_include_bots: includeBots })
  return ((data as Array<{ day: string; users: number }>) ?? []).map((r) => ({
    date: r.day,
    value: Number(r.users),
  }))
}

export async function getPageViewsByDevice(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_events_by_device', {
    p_event_name: 'page_viewed',
    p_days: days,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ device_type: string; events: number }>) ?? []).map((r) => ({
    label: r.device_type ?? 'unknown',
    value: Number(r.events),
  }))
}

export async function getTopReferrers(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_property', {
    p_property: 'first_touch_referrer',
    p_days: days,
    p_limit: 10,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value ?? '(direct)',
    value: Number(r.events),
  }))
}

// ── Plan Funnel ─────────────────────────────────────────────────────

export async function getPlanFunnel(days: DayWindow, includeBots: boolean): Promise<MetricResult[]> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const steps = ['plan_started', 'plan_intake_submitted', 'plan_completed', 'plan_results_tool_clicked']
  const results = await Promise.all(
    steps.map((step) =>
      maybeFilterBots(
        db.from('user_events').select('*', { count: 'exact', head: true })
          .eq('event_name', step).gte('created_at', cutoff),
        includeBots,
      ),
    ),
  )
  return steps.map((step, i) => ({
    label: step.replace(/_/g, ' '),
    value: results[i].count ?? 0,
  }))
}

export async function getTopExistingTools(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'plan_existing_tool_added',
    p_property: 'tool_name',
    p_days: days,
    p_limit: 15,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopUseCases(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_unnest_intent_array', {
    p_column: 'plan_use_cases_submitted',
    p_days: days,
    p_limit: 10,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.users),
  }))
}

// ── Engagement ──────────────────────────────────────────────────────

export async function getEngagementMetrics(days: DayWindow, includeBots: boolean): Promise<MetricResult[]> {
  const db = getAdminClient()
  const [today, week, month] = await Promise.all([
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(), p_include_bots: includeBots }).maybeSingle(),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoffIso(7), p_include_bots: includeBots }).maybeSingle(),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoffIso(30), p_include_bots: includeBots }).maybeSingle(),
  ])
  void days
  return [
    { label: 'DAU (today)', value: Number((today.data as { count?: number } | null)?.count ?? 0) },
    { label: 'WAU (7d)', value: Number((week.data as { count?: number } | null)?.count ?? 0) },
    { label: 'MAU (30d)', value: Number((month.data as { count?: number } | null)?.count ?? 0) },
  ]
}

export async function getTopEvents(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_events', { p_days: days, p_limit: 20, p_include_bots: includeBots })
  return ((data as Array<{ event_name: string; events: number }>) ?? []).map((r) => ({
    label: r.event_name,
    value: Number(r.events),
  }))
}

// ── Search ──────────────────────────────────────────────────────────

export async function getSearchMetrics(days: DayWindow, includeBots: boolean): Promise<MetricResult[]> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const [submitted, zeroResults, clicked] = await Promise.all([
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'search_query_submitted').gte('created_at', cutoff),
      includeBots,
    ),
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'search_query_submitted').gte('created_at', cutoff)
        .filter('properties->>zero_results', 'eq', 'true'),
      includeBots,
    ),
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'search_result_clicked').gte('created_at', cutoff),
      includeBots,
    ),
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

export async function getTopSearches(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'search_query_submitted',
    p_property: 'query',
    p_days: days,
    p_limit: 15,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

// ── AI Chat ─────────────────────────────────────────────────────────

export async function getChatMetrics(days: DayWindow, includeBots: boolean): Promise<MetricResult[]> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const [messages, uniqueUsers, toolClicks] = await Promise.all([
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'ai_chat_message').gte('created_at', cutoff),
      includeBots,
    ),
    rpc(db, 'distinct_visitors_for_event', { p_event_name: 'ai_chat_message', p_cutoff: cutoff, p_include_bots: includeBots }).maybeSingle(),
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'ai_chat_tool_clicked').gte('created_at', cutoff),
      includeBots,
    ),
  ])
  return [
    { label: 'Messages', value: messages.count ?? 0 },
    { label: 'Unique users', value: Number((uniqueUsers.data as { count?: number } | null)?.count ?? 0) },
    { label: 'Tool clicks', value: toolClicks.count ?? 0 },
  ]
}

export async function getTopChatTools(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_unnest_intent_array', {
    p_column: 'ai_chat_tools_mentioned',
    p_days: days,
    p_limit: 15,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ value: string; users: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.users),
  }))
}

// ── Vendor Audience Snapshot ────────────────────────────────────────

export async function getTopViewedTools(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'tool_page_viewed',
    p_property: 'tool_slug',
    p_days: days,
    p_limit: 20,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopClickedTools(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'tool_visit_redirected',
    p_property: 'tool_slug',
    p_days: days,
    p_limit: 20,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopSavedTools(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_jsonb_property', {
    p_event_name: 'tool_saved',
    p_property: 'tool_slug',
    p_days: days,
    p_limit: 20,
    p_include_bots: includeBots,
  })
  return ((data as Array<{ value: string; events: number }>) ?? []).map((r) => ({
    label: r.value,
    value: Number(r.events),
  }))
}

export async function getTopComparedTools(days: DayWindow, includeBots: boolean): Promise<BarRow[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_unnest_intent_array', {
    p_column: 'tools_compared_with',
    p_days: days,
    p_limit: 15,
    p_include_bots: includeBots,
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

export async function getToolAudienceDetail(slug: string, days: DayWindow, includeBots: boolean): Promise<ToolAudienceDetail> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const [views, clicks, saves, comparedWith, uniqUsers] = await Promise.all([
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'tool_page_viewed').gte('created_at', cutoff)
        .filter('properties->>tool_slug', 'eq', slug),
      includeBots,
    ),
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'tool_visit_redirected').gte('created_at', cutoff)
        .filter('properties->>tool_slug', 'eq', slug),
      includeBots,
    ),
    maybeFilterBots(
      db.from('user_events').select('*', { count: 'exact', head: true })
        .eq('event_name', 'tool_saved').gte('created_at', cutoff)
        .filter('properties->>tool_slug', 'eq', slug),
      includeBots,
    ),
    rpc(db, 'insights_tool_compared_with', { p_slug: slug, p_days: days, p_limit: 10, p_include_bots: includeBots }),
    rpc(db, 'distinct_visitors_for_tool', { p_slug: slug, p_cutoff: cutoff, p_include_bots: includeBots }).maybeSingle(),
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

export interface RawEventsFilter {
  eventName?: string
  distinctId?: string
  days: DayWindow
  includeBots: boolean
  page: number
  pageSize: number
}

export async function getRawEvents(f: RawEventsFilter): Promise<{ rows: RawEventRow[]; total: number }> {
  const db = getAdminClient()
  const cutoff = cutoffIso(f.days)
  let q = db.from('user_events')
    .select('id,created_at,event_name,distinct_id,user_id,auth_state,source_kind,device_type,page_path,referrer,properties,ip,user_agent,bot_likely', { count: 'exact' })
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .range(f.page * f.pageSize, f.page * f.pageSize + f.pageSize - 1)

  if (f.eventName) q = q.eq('event_name', f.eventName)
  if (f.distinctId) q = q.eq('distinct_id', f.distinctId)
  if (!f.includeBots) q = q.eq('bot_likely', false)

  const { data, count } = await q
  return {
    rows: (data ?? []) as unknown as RawEventRow[],
    total: count ?? 0,
  }
}

// Used to populate the event-name dropdown in /admin/insights/events
export async function getDistinctEventNames(): Promise<string[]> {
  const db = getAdminClient()
  const { data } = await rpc(db, 'insights_top_events', { p_days: 30, p_limit: 200, p_include_bots: true })
  return ((data as Array<{ event_name: string }>) ?? []).map((r) => r.event_name)
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

export async function getReconciliationStats(days: DayWindow): Promise<ReconciliationStats> {
  const db = getAdminClient()
  const cutoff = cutoffIso(days)
  const [client, server, bots, allUniq, humanUniq] = await Promise.all([
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('source_kind', 'client').gte('created_at', cutoff),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('source_kind', 'server').gte('created_at', cutoff),
    db.from('user_events').select('*', { count: 'exact', head: true })
      .eq('bot_likely', true).gte('created_at', cutoff),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoff, p_include_bots: true }).maybeSingle(),
    rpc(db, 'distinct_visitors_in_window', { p_cutoff: cutoff, p_include_bots: false }).maybeSingle(),
  ])
  return {
    days,
    client_events: client.count ?? 0,
    server_events: server.count ?? 0,
    bot_events: bots.count ?? 0,
    unique_distinct_ids: Number((allUniq.data as { count?: number } | null)?.count ?? 0),
    unique_distinct_ids_no_bots: Number((humanUniq.data as { count?: number } | null)?.count ?? 0),
    ad_block_ratio_estimate: 0.3, // industry baseline 25-35% on tech audiences
  }
}
