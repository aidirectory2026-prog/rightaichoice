'use client'

import { useEffect, useRef } from 'react'
import { recordPageView } from '@/actions/tools'
import { analytics } from '@/lib/analytics'

export function PageViewTracker({
  path,
  toolId,
  toolSlug,
}: {
  path: string
  toolId?: string
  toolSlug?: string
}) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    // Attribution-fix (2026-06-10) — pass document.referrer through to the
    // page_views insert. The column existed since 001_initial_schema but was
    // never populated (100% null), making page_views useless for attribution.
    const referrer = typeof document !== 'undefined' ? document.referrer || null : null
    recordPageView(path, toolId, referrer).catch(() => {})
    if (toolId && toolSlug) {
      analytics.toolPageViewed(toolId, toolSlug)
    }
  }, [path, toolId, toolSlug])

  return null
}
