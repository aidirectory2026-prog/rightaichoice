/**
 * Board (dashboard) definitions. Every chart on every Board lives here —
 * re-run the UI playbook when any of these change.
 *
 * Free tier constraints: unlimited charts and Boards, no JQL, no warehouse
 * sync. Goals are attached per-chart.
 */

type ChartKind =
  | 'insights_total'
  | 'insights_trend'
  | 'insights_breakdown'
  | 'funnel'
  | 'retention'
  | 'flows'

export type ChartDef = {
  title: string
  kind: ChartKind
  /** Primary event or funnel/retention id. */
  metric: string
  /** Optional breakdown property (e.g. source, utm_campaign, tool_slug). */
  breakdown?: string
  /** Time window. */
  window: 'last_7d' | 'last_30d' | 'last_90d'
  /** Short prose — shown under the chart title in the playbook. */
  note: string
}

export type BoardDef = {
  id: string
  name: string
  description: string
  owner: string
  /** Viewer accounts/emails. For free tier, Mixpanel does not throttle shares. */
  viewers: string[]
  charts: ChartDef[]
}

const OWNER = 'tanmayverma321@gmail.com'

export const BOARDS: BoardDef[] = [
  {
    id: 'north_star',
    name: '01 — North Star',
    description: 'The four numbers that matter. If these are healthy, everything else is cosmetic.',
    owner: OWNER,
    viewers: [OWNER],
    charts: [
      {
        title: 'WAU (unique users who fired page_viewed in last 7 days)',
        kind: 'insights_trend',
        metric: 'page_viewed',
        window: 'last_30d',
        note: 'Unique users, weekly resolution. Target: 500 → 2,500 (Jun → Sep).',
      },
      {
        title: 'Activation rate — % of new users hitting ≥1 milestone within 24h',
        kind: 'funnel',
        metric: 'new_user_activation',
        window: 'last_30d',
        note: 'Target: 20% → 50%.',
      },
      {
        title: 'Week-2 retention (new-user cohort)',
        kind: 'retention',
        metric: 'new_user_weekly',
        window: 'last_90d',
        note: 'Target: 15% → 30%.',
      },
      {
        title: 'Affiliate clicks per WAU',
        kind: 'insights_total',
        metric: 'tool_visit_clicked',
        window: 'last_7d',
        note: 'Formula: tool_visit_clicked ÷ WAU. Target: 0.8 → 1.5.',
      },
    ],
  },
  {
    id: 'growth',
    name: '02 — Growth',
    description: 'Top-of-funnel + signup throughput.',
    owner: OWNER,
    viewers: [OWNER],
    charts: [
      {
        title: 'Signups per day',
        kind: 'insights_trend',
        metric: 'signup_completed',
        window: 'last_30d',
        note: 'Prefer the server-side fire (source=server) for the authoritative count.',
      },
      {
        title: 'Signup sources breakdown',
        kind: 'insights_breakdown',
        metric: 'signup_started',
        breakdown: 'source',
        window: 'last_30d',
        note: 'Which CTA actually converts.',
      },
      {
        title: 'First-touch UTM source breakdown (page_viewed)',
        kind: 'insights_breakdown',
        metric: 'page_viewed',
        breakdown: 'first_touch_utm_source',
        window: 'last_30d',
        note: 'Where acquired traffic originates.',
      },
      {
        title: 'Signup → activation funnel',
        kind: 'funnel',
        metric: 'signup_activation',
        window: 'last_30d',
        note: 'Breakdown by method (google/email).',
      },
      {
        title: 'At-risk cohort trend',
        kind: 'insights_trend',
        metric: 'cohort:at_risk',
        window: 'last_30d',
        note: 'Rising = churn risk — trigger re-engagement campaign.',
      },
    ],
  },
  {
    id: 'discovery',
    name: '03 — Discovery',
    description: 'How users find and pick tools.',
    owner: OWNER,
    viewers: [OWNER],
    charts: [
      {
        title: 'Tool page views — top 20',
        kind: 'insights_breakdown',
        metric: 'tool_page_viewed',
        breakdown: 'tool_slug',
        window: 'last_30d',
        note: 'Traffic by tool. Watch for new tools that organically climb.',
      },
      {
        title: 'Tool save rate (saves / page views)',
        kind: 'insights_total',
        metric: 'tool_saved',
        window: 'last_30d',
        note: 'Formula: tool_saved ÷ tool_page_viewed. Target 2% → 5%.',
      },
      {
        title: 'Empty search feed (weekly)',
        kind: 'insights_breakdown',
        metric: 'search_no_results',
        breakdown: 'query',
        window: 'last_7d',
        note: 'Weekly review — top 20 queries = next tools to ingest.',
      },
      {
        title: 'Filter-no-results feed',
        kind: 'insights_breakdown',
        metric: 'filter_no_results',
        breakdown: 'filters',
        window: 'last_30d',
        note: 'Inventory gaps.',
      },
      {
        title: 'Compare tray depth',
        kind: 'insights_breakdown',
        metric: 'comparison_viewed',
        breakdown: 'count',
        window: 'last_30d',
        note: 'Distribution of tools per comparison view.',
      },
    ],
  },
  {
    id: 'revenue_proxy',
    name: '04 — Revenue proxy',
    description: 'Affiliate + upgrade intent. Pre-revenue, these are the best dollar proxies.',
    owner: OWNER,
    viewers: [OWNER],
    charts: [
      {
        title: 'Affiliate clicks — client vs server',
        kind: 'insights_breakdown',
        metric: 'tool_visit_clicked',
        breakdown: 'source',
        window: 'last_30d',
        note: 'Delta between client and server fires = ad-blocker loss recovered.',
      },
      {
        title: 'Top affiliate earners (by tool_slug)',
        kind: 'insights_breakdown',
        metric: 'tool_visit_redirected',
        breakdown: 'tool_slug',
        window: 'last_30d',
        note: 'Server-side authoritative.',
      },
      {
        title: 'Discovery funnel (page → tool → visit)',
        kind: 'funnel',
        metric: 'discovery_tool_visit',
        window: 'last_30d',
        note: 'Breakdown by first_touch_utm_source.',
      },
      {
        title: 'Pricing → upgrade funnel',
        kind: 'funnel',
        metric: 'monetization',
        window: 'last_30d',
        note: 'Upgrade_clicked lands before paid tier ships — watch intent.',
      },
      {
        title: 'High-intent leavers cohort size',
        kind: 'insights_trend',
        metric: 'cohort:high_intent_leavers',
        window: 'last_30d',
        note: 'Rising = expand retargeting spend.',
      },
    ],
  },
  {
    id: 'content_seo',
    name: '05 — Content & SEO',
    description: 'Blog / best / role page performance.',
    owner: OWNER,
    viewers: [OWNER],
    charts: [
      {
        title: 'Blog post views — top 20',
        kind: 'insights_breakdown',
        metric: 'blog_post_viewed',
        breakdown: 'slug',
        window: 'last_30d',
        note: 'Which posts drive traffic.',
      },
      {
        title: 'Average scroll depth on /blog',
        kind: 'insights_total',
        metric: 'scroll_depth_reached',
        window: 'last_30d',
        note: 'Filter: path starts-with /blog. Target: 45% → 75%.',
      },
      {
        title: 'Time on page — bucketed',
        kind: 'insights_breakdown',
        metric: 'time_on_page',
        breakdown: 'bucket',
        window: 'last_30d',
        note: 'Engagement quality.',
      },
      {
        title: 'Content → product funnel',
        kind: 'funnel',
        metric: 'content_to_product',
        window: 'last_30d',
        note: 'Blog → tool page conversion.',
      },
      {
        title: '/best and /for pages — views',
        kind: 'insights_breakdown',
        metric: 'best_page_viewed',
        breakdown: 'slug',
        window: 'last_30d',
        note: 'SEO landing performance.',
      },
    ],
  },
  {
    id: 'quality',
    name: '06 — Quality',
    description: 'Error rates, funnel leaks, empty searches — the first place to look when numbers drop.',
    owner: OWNER,
    viewers: [OWNER],
    charts: [
      {
        title: 'Errors by boundary (trend)',
        kind: 'insights_breakdown',
        metric: 'error_encountered',
        breakdown: 'boundary',
        window: 'last_7d',
        note: 'Click through to Sentry via mixpanel_distinct_id tag.',
      },
      {
        title: 'Empty search rate',
        kind: 'insights_total',
        metric: 'search_no_results',
        window: 'last_7d',
        note: 'Formula: search_no_results ÷ search_query_submitted. Target <8% by Sep.',
      },
      {
        title: 'Plan wizard step drop-off',
        kind: 'funnel',
        metric: 'plan_wizard',
        window: 'last_30d',
        note: 'Watch the worst step — that is the next UX fix.',
      },
      {
        title: 'Filter no-results trend',
        kind: 'insights_trend',
        metric: 'filter_no_results',
        window: 'last_30d',
        note: 'Rising = inventory gap widening.',
      },
      {
        title: 'Perf markers — p95 duration',
        kind: 'insights_breakdown',
        metric: 'perf_mark',
        breakdown: 'marker',
        window: 'last_7d',
        note: 'Set chart to p95 aggregation.',
      },
    ],
  },
]
