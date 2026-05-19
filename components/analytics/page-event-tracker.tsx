'use client'

// Phase 8.g.2 (2026-05-20) — tiny client wrapper for Server Components
// that need to fire a page-specific tracked event on mount.
//
// MixpanelProvider already fires the generic page_viewed for every route.
// This adds the per-page-typed event (e.g. dashboard_viewed) with rich
// per-page properties (saves_count, has_plans, etc.) that the operator can
// segment by in Mixpanel without joining tables.
//
// Usage from a Server Component:
//   <PageEventTracker event="dashboard_viewed" props={{ has_saves: true, saves_count: 5 }} />

import { useEffect, useRef } from 'react'
import { analytics } from '@/lib/analytics'

type EventKind =
  | 'dashboard_viewed'
  | 'saved_list_viewed'
  | 'profile_viewed'
  | 'viability_page_viewed'

type EventProps =
  | { event: 'dashboard_viewed'; props: { has_saves: boolean; saves_count: number; has_plans: boolean } }
  | { event: 'saved_list_viewed'; props: { count: number } }
  | { event: 'profile_viewed'; props: { username: string; is_own_profile: boolean } }
  | { event: 'viability_page_viewed'; props: { slug: string; page_type: 'index' | 'at_risk' | 'safe_bets' } }

export function PageEventTracker(spec: EventProps & { event: EventKind }) {
  // Refs guard against double-fire from React strict-mode dev re-renders +
  // SPA back-forward cache restores.
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    switch (spec.event) {
      case 'dashboard_viewed':
        analytics.dashboardViewed(spec.props.has_saves, spec.props.saves_count, spec.props.has_plans)
        break
      case 'saved_list_viewed':
        analytics.savedListViewed(spec.props.count)
        break
      case 'profile_viewed':
        analytics.profileViewed(spec.props.username, spec.props.is_own_profile)
        break
      case 'viability_page_viewed':
        analytics.viabilityPageViewed(spec.props.slug, spec.props.page_type)
        break
    }
  }, [spec])

  return null
}
