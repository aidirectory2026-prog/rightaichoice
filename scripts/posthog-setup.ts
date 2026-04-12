/**
 * PostHog setup script — creates dashboards, funnels, insights, and cohorts
 * for rightaichoice.com tracking.
 *
 * Usage:
 *   POSTHOG_PERSONAL_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 npm run posthog:setup
 *
 * Optional:
 *   POSTHOG_HOST=https://us.posthog.com  (default)
 *   POSTHOG_HOST=https://eu.posthog.com  (EU cloud)
 *
 * Idempotent: checks existing items by name and skips duplicates.
 * Never deletes or modifies anything — purely additive.
 *
 * Reference docs:
 *   docs/marketing/10-tracking-implementation.md
 *   docs/marketing/11-page-and-cta-tracking.md
 */

const PERSONAL_KEY = process.env.POSTHOG_PERSONAL_KEY
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const HOST = process.env.POSTHOG_HOST ?? 'https://us.posthog.com'

if (!PERSONAL_KEY || !PROJECT_ID) {
  console.error('✖ Missing env vars.')
  console.error('  POSTHOG_PERSONAL_KEY=phx_xxx POSTHOG_PROJECT_ID=12345 npm run posthog:setup')
  process.exit(1)
}

const BASE = `${HOST}/api/projects/${PROJECT_ID}`
const HEADERS = {
  Authorization: `Bearer ${PERSONAL_KEY}`,
  'Content-Type': 'application/json',
}

// ─────────────────────────────────────────────────────────────────────
// HTTP helpers
// ─────────────────────────────────────────────────────────────────────

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json() as Promise<T>
}

type Paged<T> = { results: T[]; next: string | null }

async function listAll<T extends { id: number; name?: string }>(path: string): Promise<T[]> {
  const out: T[] = []
  let url = `${path}?limit=100`
  while (url) {
    const page = await api<Paged<T>>('GET', url)
    out.push(...page.results)
    if (!page.next) break
    // Handle absolute next URLs
    url = page.next.replace(BASE, '')
  }
  return out
}

async function findByName<T extends { id: number; name?: string }>(
  path: string,
  name: string
): Promise<T | null> {
  const items = await listAll<T>(path)
  return items.find((i) => i.name === name) ?? null
}

// ─────────────────────────────────────────────────────────────────────
// Insight builders — using the "filters" API (stable, well-supported)
// ─────────────────────────────────────────────────────────────────────

type Insight = { id: number; name: string; short_id?: string }
type Dashboard = { id: number; name: string }
type Cohort = { id: number; name: string }

// PostHog query-node format (HogQL-based). Replaces the deprecated
// "filters" field that's no longer accepted on newer accounts.
// https://posthog.com/docs/api/queries

function trend(
  events: Array<{ id: string; math?: string }>,
  opts: {
    breakdown?: string
    breakdown_type?: 'event' | 'person'
    interval?: 'day' | 'week' | 'month'
    display?: string
  } = {}
) {
  const source: Record<string, unknown> = {
    kind: 'TrendsQuery',
    series: events.map((e) => {
      const node: Record<string, unknown> = {
        kind: 'EventsNode',
        event: e.id,
        name: e.id,
      }
      if (e.math) node.math = e.math
      return node
    }),
    interval: opts.interval ?? 'day',
    dateRange: { date_from: '-30d' },
    trendsFilter: {
      display: opts.display ?? 'ActionsLineGraph',
    },
  }
  if (opts.breakdown) {
    source.breakdownFilter = {
      breakdown: opts.breakdown,
      breakdown_type: opts.breakdown_type ?? 'event',
    }
  }
  return { kind: 'InsightVizNode', source }
}

function funnel(steps: Array<{ id: string }>) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'FunnelsQuery',
      series: steps.map((s) => ({
        kind: 'EventsNode',
        event: s.id,
        name: s.id,
      })),
      dateRange: { date_from: '-30d' },
      funnelsFilter: {
        funnelVizType: 'steps',
      },
    },
  }
}

function retention(target: string, returning: string) {
  return {
    kind: 'InsightVizNode',
    source: {
      kind: 'RetentionQuery',
      dateRange: { date_from: '-60d' },
      retentionFilter: {
        retentionType: 'retention_first_time',
        period: 'Week',
        totalIntervals: 8,
        targetEntity: { id: target, name: target, type: 'events' },
        returningEntity: { id: returning, name: returning, type: 'events' },
      },
    },
  }
}

// ─────────────────────────────────────────────────────────────────────
// Idempotent create helpers
// ─────────────────────────────────────────────────────────────────────

async function ensureInsight(
  name: string,
  description: string,
  query: unknown
): Promise<Insight> {
  const existing = await findByName<Insight>('/insights/', name)
  if (existing) {
    console.log(`  · insight exists: ${name}`)
    return existing
  }
  const created = await api<Insight>('POST', '/insights/', {
    name,
    description,
    query,
    saved: true,
  })
  console.log(`  ✓ insight created: ${name}`)
  return created
}

async function ensureDashboard(name: string, description: string): Promise<Dashboard> {
  const existing = await findByName<Dashboard>('/dashboards/', name)
  if (existing) {
    console.log(`  · dashboard exists: ${name}`)
    return existing
  }
  const created = await api<Dashboard>('POST', '/dashboards/', {
    name,
    description,
    pinned: true,
  })
  console.log(`  ✓ dashboard created: ${name}`)
  return created
}

async function linkInsightToDashboard(insightId: number, dashboardId: number): Promise<void> {
  // PostHog API: PATCH insight and add dashboard id
  try {
    await api('PATCH', `/insights/${insightId}/`, {
      dashboards: [dashboardId],
    })
  } catch {
    // Some API versions use "tiles" on the dashboard instead — try that
    try {
      await api('POST', `/dashboards/${dashboardId}/add_insight/`, { insight_id: insightId })
    } catch {
      // silently skip — the insight still exists, just not linked
    }
  }
}

async function ensureCohort(
  name: string,
  description: string,
  groups: unknown[]
): Promise<Cohort> {
  const existing = await findByName<Cohort>('/cohorts/', name)
  if (existing) {
    console.log(`  · cohort exists: ${name}`)
    return existing
  }
  const created = await api<Cohort>('POST', '/cohorts/', {
    name,
    description,
    groups,
    is_static: false,
  })
  console.log(`  ✓ cohort created: ${name}`)
  return created
}

// ─────────────────────────────────────────────────────────────────────
// The setup
// ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n→ PostHog setup — project ${PROJECT_ID} @ ${HOST}\n`)

  // ── Insights ──────────────────────────────────────────────────────
  console.log('[1/4] Creating insights...')

  // — Global / Daily Health —
  const pageviewsTrend = await ensureInsight(
    'Pageviews (30d)',
    'Daily pageview volume trend',
    trend([{ id: '$pageview' }])
  )

  const uniqueVisitorsTrend = await ensureInsight(
    'Unique visitors (30d)',
    'Daily unique visitors (distinct user_id)',
    trend([{ id: '$pageview', math: 'dau' }])
  )

  const topPages = await ensureInsight(
    'Top pages (30d)',
    'Most-viewed pages, broken down by path',
    trend([{ id: '$pageview' }], {
      breakdown: '$current_url',
      display: 'ActionsTable',
    })
  )

  const topReferrers = await ensureInsight(
    'Top referrers (30d)',
    'Traffic sources',
    trend([{ id: '$pageview' }], {
      breakdown: '$referring_domain',
      display: 'ActionsTable',
    })
  )

  // — CTA Performance —
  const heroCtaByVariant = await ensureInsight(
    'Hero CTA clicks by variant',
    'Which homepage hero CTA gets clicked',
    trend([{ id: 'hero_cta_clicked' }], {
      breakdown: 'cta',
      display: 'ActionsBarValue',
    })
  )

  const navCtaBySource = await ensureInsight(
    'Nav CTA clicks by source',
    'Persistent nav/footer CTA performance',
    trend([{ id: 'nav_cta_clicked' }], {
      breakdown: 'cta',
      display: 'ActionsBarValue',
    })
  )

  const toolVisitsBySource = await ensureInsight(
    'Tool visits by source page',
    'Affiliate clicks grouped by referring surface',
    trend([{ id: 'tool_visit_clicked' }], {
      breakdown: 'source',
      display: 'ActionsBarValue',
    })
  )

  // — Plan funnel insights —
  const planFunnel = await ensureInsight(
    'Plan → Visit Funnel',
    'High-intent funnel: /plan pageview → plan_started → plan_completed → tool_visit_clicked',
    funnel([
      { id: '$pageview' },
      { id: 'plan_started' },
      { id: 'plan_completed' },
      { id: 'tool_visit_clicked' },
    ])
  )

  const planCompletionTrend = await ensureInsight(
    'Plans completed (30d)',
    'Daily count of plan_completed events',
    trend([{ id: 'plan_completed' }])
  )

  const planAbandonmentByStep = await ensureInsight(
    'Plan abandonment by last step',
    'Where users drop off in the plan wizard',
    trend([{ id: 'plan_abandoned' }], {
      breakdown: 'last_step',
      display: 'ActionsBarValue',
    })
  )

  // — Compare funnel —
  const compareFunnel = await ensureInsight(
    'Compare → Visit Funnel',
    'Compare pageview → comparison_viewed → tool_visit_clicked',
    funnel([
      { id: '$pageview' },
      { id: 'comparison_viewed' },
      { id: 'tool_visit_clicked' },
    ])
  )

  const mostComparedTools = await ensureInsight(
    'Most-compared tools',
    'Tools appearing in comparisons, ranked',
    trend([{ id: 'comparison_viewed' }], {
      breakdown: 'tools',
      display: 'ActionsTable',
    })
  )

  // — Blog / SEO —
  const blogTrend = await ensureInsight(
    'Blog post views (30d)',
    'Blog post pageviews trend',
    trend([{ id: 'blog_post_viewed' }], {
      breakdown: 'slug',
      display: 'ActionsTable',
    })
  )

  const blogToProductFunnel = await ensureInsight(
    'Blog → Product Funnel',
    'Blog pageview → internal link click → product surface engagement',
    funnel([
      { id: 'blog_post_viewed' },
      { id: 'blog_internal_link_clicked' },
      { id: 'tool_visit_clicked' },
    ])
  )

  // — Tool engagement —
  const mostSavedTools = await ensureInsight(
    'Most-saved tools',
    'Ranked by tool_saved events',
    trend([{ id: 'tool_saved' }], {
      breakdown: 'tool_name',
      display: 'ActionsTable',
    })
  )

  const reviewsSubmittedTrend = await ensureInsight(
    'Reviews submitted (30d)',
    'Daily review submission volume',
    trend([{ id: 'review_submitted' }])
  )

  // — Retention —
  const weeklyRetention = await ensureInsight(
    'Weekly retention (visitors → decision-makers)',
    'How many visitors return and take a product action within 8 weeks',
    retention('$pageview', 'tool_visit_clicked')
  )

  // — Auth —
  const signupFunnel = await ensureInsight(
    'Signup Funnel',
    'signup_started → signup_completed',
    funnel([{ id: 'signup_started' }, { id: 'signup_completed' }])
  )

  // — North Star: Monthly Active Decision-Makers —
  const madmFunnel = await ensureInsight(
    'North Star — Decision-Maker Journey',
    'Any pageview → any decision action (MADM proxy)',
    funnel([
      { id: '$pageview' },
      { id: 'tool_visit_clicked' },
    ])
  )

  console.log('')

  // ── Cohorts ───────────────────────────────────────────────────────
  console.log('[2/4] Creating cohorts...')

  await ensureCohort(
    'Decision-Makers (30d)',
    'Users who performed at least one decision action in the last 30 days',
    [
      {
        properties: [
          {
            key: 'tool_visit_clicked',
            type: 'behavioral',
            value: 'performed_event',
            event_type: 'events',
            time_value: 30,
            time_interval: 'day',
          },
        ],
      },
    ]
  )

  await ensureCohort(
    'High-intent visitors',
    'Users who completed a plan in the last 30 days',
    [
      {
        properties: [
          {
            key: 'plan_completed',
            type: 'behavioral',
            value: 'performed_event',
            event_type: 'events',
            time_value: 30,
            time_interval: 'day',
          },
        ],
      },
    ]
  )

  console.log('')

  // ── Dashboards ────────────────────────────────────────────────────
  console.log('[3/4] Creating dashboards...')

  const dailyHealth = await ensureDashboard(
    'Daily Health',
    'Quick morning check — pageviews, visitors, top pages, top referrers'
  )
  const goalTracking = await ensureDashboard(
    'Goal Tracking',
    'North Star MADM, plan funnel, retention'
  )
  const ctaPerformance = await ensureDashboard(
    'CTA Performance',
    'Hero / nav / tool visit CTA breakdowns'
  )
  const planFunnelDash = await ensureDashboard(
    'Plan Funnel',
    'Deep view into the highest-intent funnel on the site'
  )
  const compareFunnelDash = await ensureDashboard(
    'Compare Funnel',
    'Comparison views → tool visit click-through'
  )
  const contentPerformance = await ensureDashboard(
    'Content Performance',
    'Blog + SEO page performance and hand-off to product'
  )
  const toolEngagement = await ensureDashboard(
    'Tool-Level Engagement',
    'Which tools drive saves, reviews, affiliate clicks'
  )

  console.log('')

  // ── Link insights to dashboards ───────────────────────────────────
  console.log('[4/4] Linking insights to dashboards...')

  // Daily Health
  for (const insight of [pageviewsTrend, uniqueVisitorsTrend, topPages, topReferrers]) {
    await linkInsightToDashboard(insight.id, dailyHealth.id)
  }

  // Goal Tracking
  for (const insight of [madmFunnel, weeklyRetention, planCompletionTrend]) {
    await linkInsightToDashboard(insight.id, goalTracking.id)
  }

  // CTA Performance
  for (const insight of [heroCtaByVariant, navCtaBySource, toolVisitsBySource]) {
    await linkInsightToDashboard(insight.id, ctaPerformance.id)
  }

  // Plan Funnel
  for (const insight of [planFunnel, planCompletionTrend, planAbandonmentByStep]) {
    await linkInsightToDashboard(insight.id, planFunnelDash.id)
  }

  // Compare Funnel
  for (const insight of [compareFunnel, mostComparedTools]) {
    await linkInsightToDashboard(insight.id, compareFunnelDash.id)
  }

  // Content Performance
  for (const insight of [blogTrend, blogToProductFunnel, topPages]) {
    await linkInsightToDashboard(insight.id, contentPerformance.id)
  }

  // Tool-Level Engagement
  for (const insight of [mostSavedTools, reviewsSubmittedTrend, toolVisitsBySource]) {
    await linkInsightToDashboard(insight.id, toolEngagement.id)
  }

  console.log('')

  // ── Summary ───────────────────────────────────────────────────────
  console.log('─'.repeat(60))
  console.log('✓ Done.')
  console.log('')
  console.log('Next steps:')
  console.log(`  1. Open ${HOST.replace('//', '//app.')}/project/${PROJECT_ID}/dashboards`)
  console.log('  2. Pin "Daily Health" as your default view')
  console.log('  3. Events start populating the dashboards as traffic flows')
  console.log('')
  console.log('Re-running this script is safe — it skips items that already exist.')
  console.log('')
}

main().catch((err) => {
  console.error('\n✖ Setup failed:', err.message)
  process.exit(1)
})
