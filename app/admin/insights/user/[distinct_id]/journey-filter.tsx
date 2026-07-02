'use client'

// Phase 14b Wave 1 — Journey tab controls for the User 360 timeline.
// The timeline is all-time by default (unchanged); picking a range narrows
// which events the session cards are built from, and the event box keeps only
// sessions that contain that event (comma list = any of them). URL-state only.

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { RangePicker } from '@/components/admin/range-picker'
import { SearchInput } from '@/components/admin/search-input'
import type { RangeKey } from '@/lib/admin/range'

export function JourneyFilter({ activeRange, hasRange }: { activeRange: RangeKey; hasRange: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function clearRange() {
    const sp = new URLSearchParams(params.toString())
    sp.delete('range')
    sp.delete('from')
    sp.delete('to')
    sp.delete('ecap')
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <SearchInput param="ev" placeholder="Only sessions with event…" />
      <button
        type="button"
        onClick={clearRange}
        className={`rounded px-2.5 py-1.5 text-xs font-medium border transition-colors ${
          !hasRange
            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
            : 'text-zinc-400 hover:text-zinc-200 border-zinc-800'
        }`}
      >
        All time
      </button>
      {/* When no range is applied we pass a non-key so no preset highlights —
          "All time" is the highlighted state instead. */}
      <RangePicker active={hasRange ? activeRange : ('none' as never)} />
    </div>
  )
}
