// Phase 10.5b.2 (2026-06-12) — /admin/insights/raw is absorbed by the
// rebuilt events explorer. The old page existed to isolate render-pipeline
// crashes by dumping every query as JSON; the explorer now exposes the same
// per-query reality (volume, raw rows, property payloads) with the registry
// attached, so this URL permanently redirects there.

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function InsightsRawRedirect() {
  redirect('/admin/insights/events')
}
