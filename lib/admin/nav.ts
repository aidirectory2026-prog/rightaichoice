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
      { href: '/admin/insights/geo', label: 'Geography', filterCapabilities: ['range', 'bots'] },
      { href: '/admin/insights/devices', label: 'Devices', filterCapabilities: ['range', 'bots'] },
    ],
  },
  {
    title: 'Behavior',
    items: [
      { href: '/admin/insights/events', label: 'Events explorer', filterCapabilities: ['range', 'bots', 'event'] },
      { href: '/admin/insights/tools', label: 'Tool engagement', filterCapabilities: ['range', 'bots'] },
      { href: '/admin/insights/funnel', label: 'Funnels', filterCapabilities: ['range', 'bots'] },
    ],
  },
  {
    title: 'Funnels & Conversion',
    items: [
      { href: '/admin/plan-conversion', label: 'Plan funnel', filterCapabilities: [] },
      { href: '/admin/onboarding', label: 'Onboarding', filterCapabilities: [] },
    ],
  },
  {
    title: 'Revenue',
    items: [
      { href: '/admin/sentiment', label: 'Sentiment & payments', filterCapabilities: [] },
    ],
  },
  {
    title: 'SEO & Growth',
    items: [
      { href: '/admin/seo-pulse', label: 'SEO Pulse', filterCapabilities: [] },
      { href: '/admin/seo-impact', label: 'SEO Impact', filterCapabilities: [] },
      { href: '/admin/niche-tracker', label: 'Niche Tracker', filterCapabilities: [] },
      { href: '/admin/ai-citations', label: 'AI Citations', filterCapabilities: [] },
      { href: '/admin/authority', label: 'Authority', filterCapabilities: [] },
      { href: '/admin/tier1-review', label: 'Tier-1 Review', filterCapabilities: [] },
    ],
  },
  {
    title: 'Content Ops',
    items: [
      { href: '/admin/updates', label: 'Knowledge Room', filterCapabilities: [] },
      { href: '/admin/tools', label: 'Tools catalog', filterCapabilities: [] },
      { href: '/admin/freshness', label: 'Freshness', filterCapabilities: [] },
      { href: '/admin/daily', label: 'Daily log', filterCapabilities: [] },
      { href: '/admin/activity', label: 'Activity', filterCapabilities: [] },
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
        description: 'Coming in Phase 8.',
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
