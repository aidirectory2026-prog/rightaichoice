'use client'

// Phase 9 — unified admin date-range picker.
// Mounted on every admin page. URL-driven so selection is bookmarkable.
// Presets: Today / Yesterday / 7d / 14d / 30d / 90d / WTD / MTD / Custom.

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { RANGE_LABELS, type RangeKey } from '@/lib/admin/range'

const QUICK_KEYS: Exclude<RangeKey, 'custom'>[] = ['today', 'yesterday', '7d', '30d']
const MORE_KEYS: Exclude<RangeKey, 'custom' | 'today' | 'yesterday' | '7d' | '30d'>[] = ['14d', '90d', 'wtd', 'mtd']

function todayInTzAsYmd(): string {
  // YYYY-MM-DD in admin TZ — used to pre-populate the custom picker.
  const tz = process.env.NEXT_PUBLIC_ADMIN_TZ || 'Asia/Kolkata'
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
}

export function RangePicker({ active }: { active: RangeKey }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [customOpen, setCustomOpen] = useState(active === 'custom')
  const [moreOpen, setMoreOpen] = useState(false)
  const urlFrom = params.get('from') ?? ''
  const urlTo = params.get('to') ?? ''
  const [from, setFrom] = useState(urlFrom)
  const [to, setTo] = useState(urlTo)

  // Re-sync the custom-date drafts when the URL changes underneath (preset
  // clicked, saved report loaded, back/forward) — the component doesn't
  // remount, and stale drafts made "Custom → Apply" navigate BACK to old dates.
  useEffect(() => setFrom(urlFrom), [urlFrom])
  useEffect(() => setTo(urlTo), [urlTo])

  // Close the "More" pop-out when clicking outside.
  useEffect(() => {
    if (!moreOpen) return
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      if (!el.closest('[data-rp-more]')) setMoreOpen(false)
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [moreOpen])

  /** Build from the CLICK-TIME URL (router updates window.location eagerly;
   *  the hook only updates on commit — building from it dropped filters
   *  chosen moments earlier). replace, not push: consistent with every other
   *  filter control, so Back leaves the page instead of undoing one chip. */
  function liveParams(): URLSearchParams {
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search)
    return new URLSearchParams(params.toString())
  }

  function applyPreset(k: Exclude<RangeKey, 'custom'>) {
    const sp = liveParams()
    sp.set('range', k)
    sp.delete('from')
    sp.delete('to')
    setCustomOpen(false)
    setMoreOpen(false)
    router.replace(`${pathname}?${sp.toString()}`)
  }

  function applyCustom() {
    if (!from && !to) return
    const sp = liveParams()
    sp.delete('range')
    if (from) sp.set('from', from)
    else sp.delete('from')
    if (to) sp.set('to', to)
    else sp.delete('to')
    setCustomOpen(false)
    router.replace(`${pathname}?${sp.toString()}`)
  }

  function presetButton(k: Exclude<RangeKey, 'custom'>) {
    const isActive = active === k
    return (
      <button
        key={k}
        type="button"
        onClick={() => applyPreset(k)}
        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-emerald-600 text-white'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
        }`}
      >
        {RANGE_LABELS[k]}
      </button>
    )
  }

  const isMoreActive = MORE_KEYS.includes(active as never)

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-900/40 p-0.5">
        {QUICK_KEYS.map(presetButton)}
        <div className="relative" data-rp-more>
          <button
            type="button"
            onClick={() => {
              setMoreOpen((v) => !v)
              setCustomOpen(false)
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              isMoreActive
                ? 'bg-emerald-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            {isMoreActive ? RANGE_LABELS[active] : 'More'}
            <span className="ml-1 text-zinc-500">▾</span>
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 flex flex-col rounded-md border border-zinc-800 bg-zinc-950 shadow-lg min-w-[160px] p-1">
              {MORE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => applyPreset(k)}
                  className={`px-3 py-2 text-xs text-left rounded transition-colors ${
                    active === k
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
                  }`}
                >
                  {RANGE_LABELS[k]}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setCustomOpen((v) => !v)
            setMoreOpen(false)
            if (!from) setFrom(todayInTzAsYmd())
            if (!to) setTo(todayInTzAsYmd())
          }}
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
            aria-label="From date"
          />
          <span className="text-zinc-500">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
            aria-label="To date"
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
