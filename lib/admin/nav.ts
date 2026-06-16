// Phase 10.4.1 (2026-06-12) — Admin IA as data.
//
// Single source of truth for the admin navigation: the sidebar, breadcrumbs
// and (later) the sitemap/learning guide all render from this array, so the
// IA can never drift between surfaces. Pure data — no React, importable from
// server and client components alike.
//
// `filterCapabilities` (Phase 10.4.7) declares which global smart filters a
// page actually honors today — the full set on /admin/insights (the global
// filter bar + AdminFilters-threaded queries), 'range'/'bots' on pages that
// still run their own RangePicker, empty where no time filtering applies.
// Phase 5 migrates the remaining pages to the full bar and extends these.

export type FilterCapability =
  | 'range'
  | 'bots'
  | 'device'
  | 'country'
  | 'auth'
  | 'event'
  | 'source'
  | 'utm'

/** The full capability set — what the global filter bar supports. */
export const ALL_FILTER_CAPABILITIES: FilterCapability[] = [
  'range', 'bots', 'device', 'country', 'auth', 'event', 'source', 'utm',
]

export interface AdminNavItem {
  href: string
  label: string
  description?: string
  /** Filter keys this page supports (see FilterCapability). */
  filterCapabilities?: FilterCapability[]
}

export interface AdminNavSection {
  title: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        href: '/admin',
        label: 'Dashboard',
        description: 'KPIs with period-over-period deltas, live pulse, drill-down panels.',
        filterCapabilities: ALL_FILTER_CAPABILITIES,
      },
      { href: '/admin/insights/live', label: 'Live', filterCapabilities: [] },
      { href: '/admin/insights/goals', label: 'Goals & KPIs', filterCapabilities: [] },
    ],
  },
  {
    title: 'Audience',
    items: [
      {
        href: '/admin/insights',
        label: 'Insights (audience+behavior)',
        description: 'Current main analytics page until Phase 5 splits it.',
        filterCapabilities: ALL_FILTER_CAPABILITIES,
      },
      {
        href: '/admin/insights/users',
        label: 'Users',
        description: 'Every visitor in the window — sortable, filterable, drill-down to the full timeline.',
        filterCapabilities: ALL_FILTER_CAPABILITIES,
      },
      { href: '/admin/insights/geo', label: 'Geography', filterCapabilities: ALL_FILTER_CAPABILITIES },
      { href: '/admin/insights/devices', label: 'Devices', filterCapabilities: ALL_FILTER_CAPABILITIES },
    ],
  },
  {
    title: 'Behavior',
    items: [
      {
        href: '/admin/insights/events',
        label: 'Events explorer',
        description: 'Every event, grouped by schema category — volume, bot split, properties, raw rows.',
        filterCapabilities: ALL_FILTER_CAPABILITIES,
      },
      {
        href: '/admin/insights/tools',
        label: 'Tool engagement',
        description: 'Per-tool views/visitors/click-outs heatmap with drill-down audiences.',
        filterCapabilities: ALL_FILTER_CAPABILITIES,
      },
      {
        href: '/admin/insights/funnel',
        label: 'Funnels',
        description: 'Plan acquisition + plan journey funnels, fully windowed and filterable.',
        filterCapabilities: ALL_FILTER_CAPABILITIES,
      },
    ],
  },
  {
    title: 'Funnels & Conversion',
    items: [
      {
        href: '/admin/plan-conversion',
        label: 'Plan funnel',
        description: 'CTA funnel + surfaces + typed-goal stream (intents honor range only).',
        filterCapabilities: ALL_FILTER_CAPABILITIES,
      },
      { href: '/admin/onboarding', label: 'Onboarding', filterCapabilities: [] },
    ],
  },
  {
    title: 'Revenue',
    items: [
      {
        href: '/admin/sentiment',
        label: 'Sentiment & payments',
        description: 'Windowed funnel + revenue (F13 fix); scans/payments tables honor range only.',
        filterCapabilities: ALL_FILTER_CAPABILITIES,
      },
    ],
  },
  {
    title: 'SEO & Growth',
    items: [
      {
        href: '/admin/seo-pulse',
        label: 'SEO Pulse',
        description: 'Weekly GSC triage queue; WoW card pairs the latest two snapshots (not date-ranged).',
        filterCapabilities: [],
      },
      { href: '/admin/seo-impact', label: 'SEO Impact', filterCapabilities: [] },
      { href: '/admin/niche-tracker', label: 'Niche Tracker', filterCapabilities: [] },
      {
        href: '/admin/ai-citations',
        label: 'AI Citations',
        description: 'Manual answer-engine citation log; KPIs use a fixed rolling 30d window (doc 11).',
        filterCapabilities: [],
      },
      {
        href: '/admin/authority',
        label: 'Authority',
        description: 'Referring-domain ledger — the "New" tile honors the date range.',
        filterCapabilities: ['range'],
      },
      { href: '/admin/tier1-review', label: 'Tier-1 Review', filterCapabilities: [] },
    ],
  },
  {
    title: 'Content Ops',
    items: [
      {
        href: '/admin/updates',
        label: 'Knowledge Room',
        description: 'User activity + pipeline results + errors over the selected window (kr_* RPCs).',
        filterCapabilities: ['range'],
      },
      { href: '/admin/tools', label: 'Tools catalog', filterCapabilities: [] },
      {
        href: '/admin/freshness',
        label: 'Freshness',
        description: 'Field × pricing-tier freshness heatmap (nightly materialized view).',
        filterCapabilities: [],
      },
      {
        href: '/admin/daily',
        label: 'Daily log',
        description: 'Human growth-loop checklist, pinned to today (IST).',
        filterCapabilities: [],
      },
      {
        href: '/admin/activity',
        label: 'Activity',
        description: 'Pipeline activity drill-down (refresh/added/latest) — Knowledge Room "view all" target.',
        filterCapabilities: [],
      },
    ],
  },
  {
    title: 'Pipelines & Health',
    items: [
      { href: '/admin/health', label: 'Pipeline health', filterCapabilities: [] },
    ],
  },
  {
    title: 'Tracking & Trust',
    items: [
      { href: '/admin/tracking-health', label: 'Tracking health', filterCapabilities: [] },
      { href: '/admin/insights/errors', label: 'Errors', filterCapabilities: ['range'], description: 'Client errors split into app bugs vs resource/extension noise.' },
      { href: '/admin/data-audit', label: 'Data audit', filterCapabilities: [] },
      { href: '/admin/insights/reconciliation', label: 'Reconciliation', filterCapabilities: ['range'] },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        href: '/admin/resources',
        label: 'Learning guide',
        description: 'How we capture, compute and trust every number — for owner and engineer alike.',
        filterCapabilities: [],
      },
      {
        href: '/admin/resources/tracking-overview',
        label: 'How tracking works',
        description: 'The non-technical story: browser → tracking code → Mixpanel + our DB → this admin.',
        filterCapabilities: [],
      },
      {
        href: '/admin/resources/tracking-technical',
        label: 'How tracking works (technical)',
        description: 'capture() → mirror → user_events; identity, sessions, bots, dedup, validation.',
        filterCapabilities: [],
      },
      {
        href: '/admin/resources/event-dictionary',
        label: 'Event dictionary',
        description: 'Every fired event + properties, generated live from the schema registry.',
        filterCapabilities: [],
      },
      {
        href: '/admin/resources/metrics',
        label: 'Metric provenance',
        description: 'What each headline metric counts, how, and why it is trusted.',
        filterCapabilities: [],
      },
      {
        href: '/admin/resources/trust',
        label: 'Trust & verification',
        description: 'The eight verification means, a "looks wrong" runbook, and the privacy posture.',
        filterCapabilities: [],
      },
      {
        href: '/admin/resources/glossary',
        label: 'Glossary & FAQ',
        description: 'distinct_id, session, bot flag, UTM, first touch, IST windows, data epochs.',
        filterCapabilities: [],
      },
    ],
  },
]

/**
 * Longest-prefix match of a pathname against the nav — powers the sidebar
 * active state and the breadcrumb. `/admin` only matches exactly (it is a
 * prefix of everything); deeper items win over shallower ones, so
 * `/admin/insights/geo` resolves to Geography, not Insights, and
 * `/admin/insights/tool/<slug>` resolves to Insights (its closest ancestor).
 */
export function matchNavEntry(
  pathname: string
): { section: AdminNavSection; item: AdminNavItem } | null {
  let best: { section: AdminNavSection; item: AdminNavItem } | null = null
  let bestLen = -1
  for (const section of ADMIN_NAV) {
    for (const item of section.items) {
      const exact = pathname === item.href
      const prefix = item.href !== '/admin' && pathname.startsWith(item.href + '/')
      if ((exact || prefix) && item.href.length > bestLen) {
        best = { section, item }
        bestLen = item.href.length
      }
    }
  }
  return best
}
