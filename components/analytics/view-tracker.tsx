/**
 * Phase 8.next Stage 3 (2026-05-13): client-side view tracker.
 *
 * Mounts on /tools/[slug] + /compare/[slug] and fires a single
 * fire-and-forget POST to /api/views/{type}/{id} on mount. Server
 * handles dedup (30-min sliding window per IP+entity via cookie) +
 * bot UA filter; this component is dumb on purpose.
 *
 * No retries on failure — idempotent failure is acceptable for a
 * vanity counter. The 0-fallback display logic on the page handler
 * already covers the "increment failed" case.
 */
'use client'

import { useEffect } from 'react'

export function ViewTracker({
  entityType,
  entityId,
}: {
  entityType: 'tool' | 'compare'
  entityId: string
}) {
  useEffect(() => {
    // Only fire client-side, only once per mount. Strict-mode double-
    // mount in dev is fine — server dedup catches it.
    void fetch(`/api/views/${entityType}/${entityId}`, {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => {
      // Swallow — this is a vanity counter, not load-bearing.
    })
  }, [entityType, entityId])

  return null
}
