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
    recordPageView(path, toolId).catch(() => {})
    if (toolId && toolSlug) {
      analytics.toolPageViewed(toolId, toolSlug)
    }
  }, [path, toolId, toolSlug])

  return null
}
