// Phase 8.g.4 (2026-05-20) — declarative spec for the Mixpanel dashboard.
//
// This file is the SOURCE OF TRUTH for every Cohort / Funnel / Board / Alert
// we want in the project. provision-dashboards.ts reads from here and applies
// to the live project via the Service Account API. Same pattern as
// provision-lexicon.ts reading from config/events.ts.
//
// If you want a new dashboard artifact: add it here, then re-run
// `npm run mixpanel:dashboards`.

export interface CohortSpec {
  name: string
  description: string
  // Mixpanel cohort definitions are complex JSON; we keep a human-readable
  // "filter" string here that the provisioning script translates. For cohorts
  // the API can't auto-create, this string lives as the documentation.
  filter: string
  category: 'engagement' | 'segment' | 'health' | 'vendor_target'
}

export interface FunnelSpec {
  name: string
  description: string
  steps: string[] // event names in order
  windowDays: number
}

export interface BoardSpec {
  name: string
  description: string
  audience: 'operator' | 'vendor_pitch'
  tiles: BoardTileSpec[]
}

export interface BoardTileSpec {
  title: string
  // What kind of Mixpanel report drives this tile. Mapped to API entity types
  // by the provisioning script when supported.
  kind: 'insight' | 'funnel' | 'retention' | 'cohort_count'
  description: string
}

export interface AlertSpec {
  name: string
  description: string
  triggerOn: string // human-readable threshold for documentation
}

// ── 12 cohorts ──────────────────────────────────────────────────────
export const COHORTS: CohortSpec[] = [
  {
    name: 'Comparison power users',
    description: 'Users with ≥3 comparison_viewed events in last 14 days.',
    filter: 'comparison_viewed count >=3 in last 14 days',
    category: 'engagement',
  },
  {
    name: 'Plan completers',
    description: 'Users who completed the planner at least once.',
    filter: 'plan_completed count >=1 ever',
    category: 'engagement',
  },
  {
    name: 'Multi-saved',
    description: 'Users with saves_count >= 5 (people property).',
    filter: 'people.saves_count >=5',
    category: 'engagement',
  },
  {
    name: 'High-intent leavers',
    description: 'Started plan flow but never completed in last 7 days.',
    filter: 'plan_started count >=1 AND plan_completed count =0 in last 7 days',
    category: 'health',
  },
  {
    name: 'Category loyal',
    description: 'Users with ≥10 tool_page_viewed for tools in a single category in 30 days.',
    filter: 'tool_page_viewed grouped by category count >=10 in last 30 days',
    category: 'segment',
  },
  {
    name: 'Returning weekly',
    description: 'Users with ≥3 distinct active days in last 14 days.',
    filter: 'distinct active days >=3 in last 14 days',
    category: 'engagement',
  },
  {
    name: 'Ad-block users',
    description: 'Server tool_visit_redirected without matching client tool_visit_clicked.',
    filter: 'tool_visit_redirected source=server AND no matching tool_visit_clicked client',
    category: 'health',
  },
  {
    name: 'AI-chat-engaged',
    description: 'Users with ≥2 ai_chat_message events.',
    filter: 'ai_chat_message count >=2',
    category: 'engagement',
  },
  {
    name: 'Mobile-only',
    description: 'Users where device_type=mobile on >80% of sessions.',
    filter: 'super.device_type =mobile in last 30 days',
    category: 'segment',
  },
  {
    name: 'Affiliate clickers',
    description: 'Users with ≥1 tool_visit_redirected in 30 days (revenue-adjacent).',
    filter: 'tool_visit_redirected count >=1 in last 30 days',
    category: 'engagement',
  },
  {
    name: 'Reviewers',
    description: 'Users who submitted ≥1 review.',
    filter: 'review_submitted count >=1 ever',
    category: 'engagement',
  },
  {
    name: 'Existing-tool mentioner: {tool_slug}',
    description: 'Template — instantiated per top-100 tool. Users whose existing_tools_history people prop contains <tool>. VENDOR TARGET.',
    filter: 'people.existing_tools_history contains <tool_name>',
    category: 'vendor_target',
  },
]

// ── 10 funnels ──────────────────────────────────────────────────────
export const FUNNELS: FunnelSpec[] = [
  {
    name: 'Acquisition: landing → tool visit',
    description: 'Top-of-funnel revenue flow.',
    steps: ['page_viewed', 'search_query_submitted', 'tool_page_viewed', 'tool_visit_clicked'],
    windowDays: 7,
  },
  {
    name: 'Plan flow: start → completion → click-through',
    description: 'Full planner conversion funnel.',
    steps: ['plan_started', 'plan_intake_submitted', 'plan_completed', 'plan_results_tool_clicked'],
    windowDays: 7,
  },
  {
    name: 'Recommend: submit → click → visit',
    description: '/recommend wizard conversion.',
    steps: ['recommendation_requested', 'recommendation_result_clicked', 'tool_visit_clicked'],
    windowDays: 1,
  },
  {
    name: 'Review submission abandonment',
    description: 'Where reviewers drop off.',
    steps: ['review_form_opened', 'review_rating_set', 'review_submitted'],
    windowDays: 30,
  },
  {
    name: 'Signup → first save → D7 return',
    description: 'Activation + retention.',
    steps: ['signup_completed', 'tool_saved', 'page_viewed'],
    windowDays: 7,
  },
  {
    name: 'Compare → visit',
    description: 'Compare-driven affiliate clicks.',
    steps: ['compare_tool_added', 'comparison_viewed', 'tool_visit_clicked'],
    windowDays: 1,
  },
  {
    name: 'Homepage hero → signup',
    description: 'Hero CTA conversion.',
    steps: ['hero_cta_clicked', 'signup_started', 'signup_completed'],
    windowDays: 1,
  },
  {
    name: 'AI chat: message → tool suggested → tool clicked',
    description: 'AI chat → click-through.',
    steps: ['ai_chat_message', 'ai_chat_response_received', 'ai_chat_tool_clicked'],
    windowDays: 7,
  },
  {
    name: 'Saved list → revisit → visit',
    description: 'Saved-list utility.',
    steps: ['tool_saved', 'saved_list_viewed', 'tool_visit_clicked'],
    windowDays: 30,
  },
  {
    name: 'Search typing → submit → click',
    description: 'Search abandonment vs completion.',
    steps: ['search_typing', 'search_query_submitted', 'search_result_clicked'],
    windowDays: 1,
  },
]

// ── 10 boards (8 operational + 2 vendor-pitch) ──────────────────────
export const BOARDS: BoardSpec[] = [
  {
    name: 'North Star',
    description: 'Top-level health: WAU, activation, affiliate clicks, retention.',
    audience: 'operator',
    tiles: [
      { title: 'Weekly Active Users', kind: 'insight', description: 'distinct page_viewed by week.' },
      { title: 'New signups (7d)', kind: 'insight', description: 'signup_completed count.' },
      { title: 'tool_visit_redirected (7d)', kind: 'insight', description: 'Revenue proxy.' },
      { title: 'D7 retention by signup cohort', kind: 'retention', description: 'signup_completed → any active event.' },
    ],
  },
  {
    name: 'Acquisition',
    description: 'Channel performance: where users come from + how they convert.',
    audience: 'operator',
    tiles: [
      { title: 'Page views by utm_source', kind: 'insight', description: 'page_viewed grouped by first_touch_utm_source.' },
      { title: 'Signup rate by channel', kind: 'insight', description: 'signup_completed / page_viewed per channel.' },
    ],
  },
  {
    name: 'Activation',
    description: 'Onboarding + first-action funnel.',
    audience: 'operator',
    tiles: [
      { title: 'Activation funnel', kind: 'funnel', description: 'page_viewed → tool_page_viewed → tool_saved → plan_completed.' },
      { title: 'Time-to-first-save by channel', kind: 'insight', description: 'people.first_save_at - signup_at, grouped by utm_source.' },
    ],
  },
  {
    name: 'Engagement',
    description: 'Depth of use: tool views, comparisons, AI chat.',
    audience: 'operator',
    tiles: [
      { title: 'tool_page_viewed by hour', kind: 'insight', description: 'Traffic heatmap.' },
      { title: 'comparison_viewed depth distribution', kind: 'insight', description: 'count by tools_count.' },
      { title: 'AI chat conversation turns', kind: 'insight', description: 'ai_chat_message grouped by conversation_turn.' },
    ],
  },
  {
    name: 'Retention',
    description: 'Cohort retention curves.',
    audience: 'operator',
    tiles: [
      { title: 'Retention by signup week', kind: 'retention', description: 'D1/D7/D30 by cohort.' },
      { title: 'Retention by auth_state', kind: 'retention', description: 'Logged-in vs anon return-rate.' },
    ],
  },
  {
    name: 'Content',
    description: 'Blog / best / role page performance.',
    audience: 'operator',
    tiles: [
      { title: 'blog_post_viewed top 20', kind: 'insight', description: '' },
      { title: 'scroll_depth_reached 75%+ rate', kind: 'insight', description: 'Content quality grade.' },
    ],
  },
  {
    name: 'Search Quality',
    description: 'Search performance + zero-result detection.',
    audience: 'operator',
    tiles: [
      { title: 'Top queries (7d)', kind: 'insight', description: 'search_query_submitted top by count.' },
      { title: 'Zero-result rate', kind: 'insight', description: 'search_no_results / search_query_submitted.' },
      { title: 'Top abandoned search_typing', kind: 'insight', description: 'queries with no matching search_query_submitted.' },
    ],
  },
  {
    name: 'Revenue Proxy',
    description: 'Affiliate clicks + reconciliation with DB.',
    audience: 'operator',
    tiles: [
      { title: 'tool_visit_redirected by tool (30d)', kind: 'insight', description: 'Per-tool revenue ranking.' },
      { title: 'Mixpanel vs click_logs delta', kind: 'insight', description: 'Server-vs-DB reconciliation (target <5%).' },
    ],
  },

  // ── VENDOR-PITCH BOARDS (the salable artifact) ───────────────────
  {
    name: 'Per-Tool Audience Snapshot ({tool_slug})',
    description: 'PARAMETERIZED per tool. THE salable artifact — one buyable view per vendor.',
    audience: 'vendor_pitch',
    tiles: [
      { title: '30d unique viewers', kind: 'insight', description: 'tool_page_viewed distinct users where tool_slug=X.' },
      { title: '30d saves + save rate', kind: 'insight', description: 'tool_saved / tool_page_viewed.' },
      { title: '30d affiliate click-throughs', kind: 'insight', description: 'tool_visit_redirected — buy-intent.' },
      { title: 'Top 10 tools compared against this one', kind: 'insight', description: 'comparison_viewed.tools containing X, grouped by other tools.' },
      { title: 'Plan-inclusion rate', kind: 'insight', description: 'plan_results_displayed.recommended_tool_slugs containing X / total plan_completed.' },
      { title: 'Existing-tool mentioner segment', kind: 'cohort_count', description: 'people.existing_tools_history contains X.' },
      { title: 'User segment breakdown', kind: 'insight', description: 'viewers grouped by first_touch_utm_source, device_type, plan_industry_segment.' },
      { title: 'Funnel: page → save → visit_click', kind: 'funnel', description: 'Per-tool conversion.' },
      { title: 'Reviews this month', kind: 'insight', description: 'review_submitted.tool_slug=X count + avg rating.' },
    ],
  },
  {
    name: 'Category Heatmap',
    description: 'For vendors who want category-level audience data.',
    audience: 'vendor_pitch',
    tiles: [
      { title: 'tool_page_viewed unique users by category × week', kind: 'insight', description: 'Heatmap.' },
    ],
  },
]

// ── 6 alerts ────────────────────────────────────────────────────────
export const ALERTS: AlertSpec[] = [
  { name: 'Funnel conversion drop ±30%', description: 'Every funnel above.', triggerOn: 'Day-over-day conversion change > 30%.' },
  { name: 'tool_visit_redirected drop >25%', description: 'Revenue alarm.', triggerOn: 'Daily count drops >25% vs trailing 7d mean.' },
  { name: 'error_encountered spike', description: 'Quality alarm.', triggerOn: '>50 errors / day.' },
  { name: 'Per-tool z-score >2 (sudden interest)', description: 'Vendor opportunity alert.', triggerOn: 'tool_page_viewed for any tool z-score >2 vs its 30d mean.' },
  { name: 'signup_completed server-vs-client delta >20%', description: 'Identity stitching breakage.', triggerOn: '|server_count - client_count| / server_count > 20%.' },
  { name: 'Search zero-result spike', description: 'Catalog gap alert.', triggerOn: 'search_no_results rate >15% in any 1h window.' },
]
