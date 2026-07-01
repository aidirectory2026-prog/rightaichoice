'use client'

// Phase 14 Wave 3 — pin the whole page to a saved cohort. Populates from
// /api/admin/cohort (saved segments) and writes ?cohort=<id>; the server
// resolves it to a distinct_id set (lib/admin/cohort-filter.ts) so every chart
// reflects just that segment. Hidden when there are no saved cohorts.

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Users } from 'lucide-react'

type View = { id: string; name: string }

export function CohortPicker() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [views, setViews] = useState<View[]>([])
  const active = params.get('cohort') ?? ''

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/cohort')
      .then((r) => (r.ok ? r.json() : { views: [] }))
      .then((d: { views?: Array<{ id: string; name: string }> }) => {
        if (!cancelled) setViews((d.views ?? []).map((v) => ({ id: v.id, name: v.name })))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  function set(id: string) {
    const sp = new URLSearchParams(params.toString())
    if (id) sp.set('cohort', id)
    else sp.delete('cohort')
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  // Nothing to show if no saved cohorts (and none currently applied).
  if (views.length === 0 && !active) return null

  return (
    <label
      className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium border transition-colors ${
        active ? 'bg-violet-950/40 text-violet-300 border-violet-800' : 'text-zinc-400 border-zinc-800'
      }`}
      title="Pin every chart on this page to a saved cohort"
    >
      <Users className="h-3 w-3" />
      <select
        value={active}
        onChange={(e) => set(e.target.value)}
        className="cursor-pointer bg-transparent focus:outline-none"
      >
        <option value="" className="bg-zinc-900 text-zinc-200">Everyone</option>
        {views.map((v) => (
          <option key={v.id} value={v.id} className="bg-zinc-900 text-zinc-200">
            {v.name}
          </option>
        ))}
      </select>
    </label>
  )
}
