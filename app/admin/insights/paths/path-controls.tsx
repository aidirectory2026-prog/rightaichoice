'use client'

// Phase 14b Wave 4 — path tree controls: anchor event + walk direction.

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function PathControls({
  anchor,
  direction,
  eventNames,
}: {
  anchor: string | null
  direction: 'after' | 'before'
  eventNames: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [draft, setDraft] = useState(anchor ?? '')

  function set(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set(key, value)
    else sp.delete(key)
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
        Anchor event
        <input
          list="paths-events"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') set('anchor', draft.trim() || null)
          }}
          onBlur={() => {
            if (draft.trim() !== (anchor ?? '')) set('anchor', draft.trim() || null)
          }}
          placeholder="session start (any)"
          className="w-60 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-700 focus:outline-none"
        />
      </label>
      <datalist id="paths-events">
        {eventNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <div className="flex items-center gap-1">
        {(['after', 'before'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => set('dir', d === 'after' ? null : d)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] ${
              direction === d
                ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {d === 'after' ? 'What happens after' : 'What led to it'}
          </button>
        ))}
      </div>
    </div>
  )
}
