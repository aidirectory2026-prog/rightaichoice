'use client'

// Phase 8.d.6 — shared admin date-range picker.
// Mounted in /admin/updates, /admin/analytics, /admin/authority, /admin/tools.
// URL-driven so selection is bookmarkable + shareable.

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { RANGE_LABELS, type RangeKey } from '@/lib/admin/range'

const PRESET_KEYS: Exclude<RangeKey, 'custom'>[] = ['today', '7d', '30d']

export function RangePicker({ active }: { active: RangeKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [customOpen, setCustomOpen] = useState(active === 'custom')
  const [from, setFrom] = useState(params.get('from') ?? '')
  const [to, setTo] = useState(params.get('to') ?? '')

  function applyPreset(k: Exclude<RangeKey, 'custom'>) {
    const sp = new URLSearchParams(params.toString())
    sp.set('range', k)
    sp.delete('from')
    sp.delete('to')
    setCustomOpen(false)
    router.push(`${pathname}?${sp.toString()}`)
  }

  function applyCustom() {
    if (!from && !to) return
    const sp = new URLSearchParams(params.toString())
    sp.delete('range')
    if (from) sp.set('from', from)
    else sp.delete('from')
    if (to) sp.set('to', to)
    else sp.delete('to')
    router.push(`${pathname}?${sp.toString()}`)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/40 p-0.5">
        {PRESET_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => applyPreset(k)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              active === k
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            {RANGE_LABELS[k]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            active === 'custom'
              ? 'bg-emerald-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          Custom
        </button>
      </div>
      {customOpen && (
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
          />
          <span className="text-zinc-500">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
