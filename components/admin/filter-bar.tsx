'use client'

// Phase 10.4.7 (2026-06-12) — global smart filter bar.
//
// URL-state only (shareable/bookmarkable): every control reads from and
// writes to searchParams via router.replace, so the server page re-renders
// with the new filters and back/forward navigation works. Parsing +
// sanitization live in lib/admin/filters.ts (parseAdminFilters); the bar
// never interprets values itself.
//
// Composition: the proven RangePicker is REUSED as-is; this bar adds the
// bots toggle + a collapsible "Filters" disclosure with the optional
// dimension filters (device / country / auth / event / source / utm_source)
// and active-filter chips with one-click clear.

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Bot, SlidersHorizontal, X } from 'lucide-react'
import { RangePicker } from '@/components/admin/range-picker'
import type { RangeKey } from '@/lib/admin/range'
import { DEVICE_OPTIONS, OPTIONAL_FILTER_PARAMS } from '@/lib/admin/filters'

const PARAM_LABELS: Record<string, string> = {
  device: 'Device',
  country: 'Country',
  source: 'Source',
  utm_source: 'UTM source',
  utm_medium: 'UTM medium',
  utm_campaign: 'UTM campaign',
  auth: 'Auth',
  event: 'Event',
}

const selectCls =
  'bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-700'
const inputCls =
  'bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-700 w-36'

export function FilterBar({
  activeRange,
  countries,
  eventNames,
}: {
  activeRange: RangeKey
  countries: string[]
  eventNames: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(
    // Auto-expand when a shared/bookmarked URL already carries filters.
    OPTIONAL_FILTER_PARAMS.some((k) => !!params.get(k)),
  )
  const [sourceDraft, setSourceDraft] = useState(params.get('source') ?? '')
  const [utmDraft, setUtmDraft] = useState(params.get('utm_source') ?? '')
  const [eventDraft, setEventDraft] = useState(params.get('event') ?? '')

  const includeBots = params.get('bots') === '1' || params.get('include_bots') === '1'
  const active = OPTIONAL_FILTER_PARAMS.filter((k) => !!params.get(k))

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set(key, value)
    else sp.delete(key)
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function clearAll() {
    const sp = new URLSearchParams(params.toString())
    for (const k of OPTIONAL_FILTER_PARAMS) sp.delete(k)
    setSourceDraft('')
    setUtmDraft('')
    setEventDraft('')
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  function toggleBots() {
    const sp = new URLSearchParams(params.toString())
    sp.delete('include_bots') // migrate the legacy param on first toggle
    if (includeBots) sp.delete('bots')
    else sp.set('bots', '1')
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          type="button"
          onClick={toggleBots}
          className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium border transition-colors ${
            includeBots
              ? 'bg-amber-950/40 text-amber-300 border-amber-800'
              : 'text-zinc-400 hover:text-zinc-200 border-zinc-800'
          }`}
        >
          <Bot className="h-3 w-3" />
          {includeBots ? 'Including bots' : 'Humans only'}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium border transition-colors ${
            active.length > 0
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
              : open
                ? 'text-zinc-200 border-zinc-700 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200 border-zinc-800'
          }`}
          aria-expanded={open}
        >
          <SlidersHorizontal className="h-3 w-3" />
          Filters
          {active.length > 0 && (
            <span className="rounded-full bg-emerald-700 px-1.5 text-[10px] font-semibold text-white">
              {active.length}
            </span>
          )}
        </button>
        <RangePicker active={activeRange} />
      </div>

      {active.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {active.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === 'source') setSourceDraft('')
                if (k === 'utm_source') setUtmDraft('')
                if (k === 'event') setEventDraft('')
                setParam(k, null)
              }}
              className="group flex items-center gap-1 rounded-full border border-emerald-800/60 bg-emerald-950/30 px-2 py-0.5 text-[10px] text-emerald-300 hover:border-emerald-600"
              title={`Clear ${PARAM_LABELS[k]}`}
            >
              <span className="text-emerald-500/80">{PARAM_LABELS[k]}:</span>
              <span className="font-medium">{params.get(k)}</span>
              <X className="h-2.5 w-2.5 text-emerald-500 group-hover:text-emerald-200" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
          >
            Clear all
          </button>
        </div>
      )}

      {open && (
        <div className="flex items-center gap-2 flex-wrap justify-end rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Device
            <select
              value={params.get('device') ?? ''}
              onChange={(e) => setParam('device', e.target.value || null)}
              className={selectCls}
            >
              <option value="">All</option>
              {DEVICE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Country
            <select
              value={params.get('country') ?? ''}
              onChange={(e) => setParam('country', e.target.value || null)}
              className={selectCls}
            >
              <option value="">All</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Auth
            <select
              value={params.get('auth') ?? ''}
              onChange={(e) => setParam('auth', e.target.value || null)}
              className={selectCls}
            >
              <option value="">All</option>
              <option value="known">Logged in</option>
              <option value="anon">Anonymous</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Event
            <input
              list="filter-bar-events"
              value={eventDraft}
              onChange={(e) => setEventDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParam('event', eventDraft.trim() || null)
              }}
              onBlur={() => {
                // Datalist picks commit on blur too (mouse selection).
                if (eventDraft.trim() !== (params.get('event') ?? '')) {
                  setParam('event', eventDraft.trim() || null)
                }
              }}
              placeholder="any event"
              className={inputCls}
            />
            <datalist id="filter-bar-events">
              {eventNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>

          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Source
            <input
              value={sourceDraft}
              onChange={(e) => setSourceDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParam('source', sourceDraft.trim() || null)
              }}
              placeholder="referrer host ⏎"
              className={inputCls}
            />
          </label>

          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            UTM src
            <input
              value={utmDraft}
              onChange={(e) => setUtmDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setParam('utm_source', utmDraft.trim() || null)
              }}
              placeholder="utm_source ⏎"
              className={inputCls}
            />
          </label>
        </div>
      )}
    </div>
  )
}
