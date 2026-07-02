'use client'

// Phase 14b Wave 5 — "Export CSV of the current view": downloads the raw
// events behind the page's CURRENT filter state (range/bots/dimensions/
// cohort/person all apply) via /api/admin/export?type=filtered_events.
// Mounted in the FilterBar → available on every filter-bar page.

import { useSearchParams } from 'next/navigation'
import { Download } from 'lucide-react'

export function ExportCsvButton() {
  const params = useSearchParams()

  const href = () => {
    const sp = new URLSearchParams(params.toString())
    sp.set('type', 'filtered_events')
    return `/api/admin/export?${sp.toString()}`
  }

  return (
    <a
      href={href()}
      className="flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
      title="Download the raw events behind the current filters (max 50k rows)"
    >
      <Download className="h-3 w-3" />
      CSV
    </a>
  )
}
