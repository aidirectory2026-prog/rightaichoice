'use client'

import { useEffect, useRef } from 'react'
import { analytics } from '@/lib/analytics'

/**
 * Fires comparison_viewed once when a /compare/[slug] detail page mounts.
 * Mirrors the mount-once pattern in components/tools/page-view-tracker.tsx.
 * Server component renders this with the two tool slugs (and compare slug)
 * so the /admin dashboards that consume comparison_viewed stop reading a
 * dead event.
 */
export function CompareViewTracker({
  toolSlugs,
  isEditorialCompare,
  compareSlug,
  categoriesRepresented,
}: {
  toolSlugs: string[]
  isEditorialCompare: boolean
  compareSlug: string | null
  categoriesRepresented: string[]
}) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    analytics.comparisonViewedRich(
      toolSlugs,
      isEditorialCompare,
      compareSlug,
      categoriesRepresented,
    )
    // Mount-once: empty dep array so a parent re-render can't refire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
