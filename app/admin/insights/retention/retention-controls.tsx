'use client'

// Phase 14b Wave 4 — retention grid controls: day/week granularity + optional
// anchor ("first did …") and return ("came back and did …") events. URL-state.

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

const inputCls =
  'w-52 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none'

export function RetentionControls({
  period,
  firstEvent,
  returnEvent,
  eventNames,
}: {
  period: 'day' | 'week'
  firstEvent: string | null
  returnEvent: string | null
  eventNames: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [firstDraft, setFirstDraft] = useState(firstEvent ?? '')
  const [returnDraft, setReturnDraft] = useState(returnEvent ?? '')

  // Props re-flow on navigation but state doesn't — re-sync so the inputs
  // never disagree with the grid (saved reports / Clear all / back-forward).
  useEffect(() => setFirstDraft(firstEvent ?? ''), [firstEvent])
  useEffect(() => setReturnDraft(returnEvent ?? ''), [returnEvent])

  function set(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set(key, value)
    else sp.delete(key)
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <div className="flex items-center gap-1">
        {(['week', 'day'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set('period', p === 'week' ? null : p)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
              period === p
                ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {p === 'week' ? 'Weekly' : 'Daily'}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
        First did
        <input
          list="retention-events"
          value={firstDraft}
          onChange={(e) => setFirstDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') set('first', firstDraft.trim() || null)
          }}
          onBlur={() => {
            if (firstDraft.trim() !== (firstEvent ?? '')) set('first', firstDraft.trim() || null)
          }}
          placeholder="any event (first visit)"
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
        Came back and did
        <input
          list="retention-events"
          value={returnDraft}
          onChange={(e) => setReturnDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') set('return', returnDraft.trim() || null)
          }}
          onBlur={() => {
            if (returnDraft.trim() !== (returnEvent ?? '')) set('return', returnDraft.trim() || null)
          }}
          placeholder="any event"
          className={inputCls}
        />
      </label>
      <datalist id="retention-events">
        {eventNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  )
}
