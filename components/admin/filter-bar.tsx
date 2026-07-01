'use client'

// Phase 10.4.7 → Phase 14 — global smart filter bar (now multi-value).
//
// URL-state only (shareable/bookmarkable): every control reads from and writes
// to searchParams via router.replace, so the server page re-renders with the new
// filters and back/forward works. Parsing + sanitization live in
// lib/admin/filters.ts (parseAdminFilters); the bar never interprets values.
//
// Phase 14: dimension filters are MULTI-VALUE — each optional param holds a
// comma list (e.g. ?country=IN,US&device=mobile,tablet). Device is a pill group;
// country is an "add" dropdown; event/source/utm add on Enter/blur. Every
// selected value shows as a removable chip. The shared SQL predicate (mig 181)
// treats a comma list as IN/OR. RangePicker + bots toggle are unchanged.

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
    // Discoverability: default OPEN when the page offers dimension filters (else
    // "I can't filter by geo" was really "I couldn't find the collapsed panel").
    OPTIONAL_FILTER_PARAMS.some((k) => !!params.get(k)) || countries.length > 0 || eventNames.length > 0,
  )
  const [sourceDraft, setSourceDraft] = useState('')
  const [utmDraft, setUtmDraft] = useState('')
  const [eventDraft, setEventDraft] = useState('')

  const includeBots = params.get('bots') === '1' || params.get('include_bots') === '1'
  // total selected values across all optional dimensions (for the badge)
  const activeCount = OPTIONAL_FILTER_PARAMS.reduce((n, k) => n + listOf(k).length, 0)

  /** Current comma-list values for an optional param. */
  function listOf(key: string): string[] {
    return (params.get(key) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  function navigate(sp: URLSearchParams) {
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  /** Replace a param with a value list (comma-joined); empty → delete. */
  function setList(key: string, values: string[]) {
    const sp = new URLSearchParams(params.toString())
    const uniq = [...new Set(values.map((v) => v.trim()).filter(Boolean))]
    if (uniq.length) sp.set(key, uniq.join(','))
    else sp.delete(key)
    navigate(sp)
  }
  const addValue = (key: string, v: string) => {
    const cur = listOf(key)
    if (v && !cur.includes(v)) setList(key, [...cur, v])
  }
  const removeValue = (key: string, v: string) => setList(key, listOf(key).filter((x) => x !== v))

  /** Single-value set (auth). */
  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set(key, value)
    else sp.delete(key)
    navigate(sp)
  }

  function clearAll() {
    const sp = new URLSearchParams(params.toString())
    for (const k of OPTIONAL_FILTER_PARAMS) sp.delete(k)
    setSourceDraft('')
    setUtmDraft('')
    setEventDraft('')
    navigate(sp)
  }

  function toggleBots() {
    const sp = new URLSearchParams(params.toString())
    sp.delete('include_bots') // migrate the legacy param on first toggle
    if (includeBots) sp.delete('bots')
    else sp.set('bots', '1')
    navigate(sp)
  }

  const deviceSel = listOf('device')

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <button
          type="button"
          onClick={toggleBots}
          className={`flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium border transition-colors ${
            includeBots ? 'bg-amber-950/40 text-amber-300 border-amber-800' : 'text-zinc-400 hover:text-zinc-200 border-zinc-800'
          }`}
        >
          <Bot className="h-3 w-3" />
          {includeBots ? 'Including bots' : 'Humans only'}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium border transition-colors ${
            activeCount > 0
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
              : open
                ? 'text-zinc-200 border-zinc-700 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200 border-zinc-800'
          }`}
          aria-expanded={open}
        >
          <SlidersHorizontal className="h-3 w-3" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-emerald-700 px-1.5 text-[10px] font-semibold text-white">{activeCount}</span>
          )}
        </button>
        <RangePicker active={activeRange} />
      </div>

      {/* Active-value chips — one per selected value, removable. */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {OPTIONAL_FILTER_PARAMS.flatMap((k) =>
            listOf(k).map((v) => (
              <button
                key={`${k}:${v}`}
                type="button"
                onClick={() => removeValue(k, v)}
                className="group flex items-center gap-1 rounded-full border border-emerald-800/60 bg-emerald-950/30 px-2 py-0.5 text-[10px] text-emerald-300 hover:border-emerald-600"
                title={`Remove ${PARAM_LABELS[k]}: ${v}`}
              >
                <span className="text-emerald-500/80">{PARAM_LABELS[k]}:</span>
                <span className="font-medium">{v}</span>
                <X className="h-2.5 w-2.5 text-emerald-500 group-hover:text-emerald-200" />
              </button>
            )),
          )}
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
        <div className="flex items-center gap-3 flex-wrap justify-end rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
          {/* Device — multi-select pills (4 options). */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Device</span>
            <div className="flex gap-1">
              {DEVICE_OPTIONS.map((d) => {
                const on = deviceSel.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => (on ? removeValue('device', d) : addValue('device', d))}
                    aria-pressed={on}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                      on
                        ? 'border-emerald-700 bg-emerald-950/50 text-emerald-300'
                        : 'border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Country — pick to ADD; selected shown as chips above. */}
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Country
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) addValue('country', e.target.value)
              }}
              className={selectCls}
            >
              <option value="">add…</option>
              {countries
                .filter((c) => !listOf('country').includes(c))
                .map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
            </select>
          </label>

          {/* Auth — single value. */}
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

          {/* Event — type/pick to ADD (multi). */}
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Event
            <input
              list="filter-bar-events"
              value={eventDraft}
              onChange={(e) => setEventDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && eventDraft.trim()) {
                  addValue('event', eventDraft.trim())
                  setEventDraft('')
                }
              }}
              onBlur={() => {
                if (eventDraft.trim()) {
                  addValue('event', eventDraft.trim())
                  setEventDraft('')
                }
              }}
              placeholder="add event ⏎"
              className={inputCls}
            />
            <datalist id="filter-bar-events">
              {eventNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </label>

          {/* Source — add on Enter/blur (multi). */}
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            Source
            <input
              value={sourceDraft}
              onChange={(e) => setSourceDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sourceDraft.trim()) {
                  addValue('source', sourceDraft.trim())
                  setSourceDraft('')
                }
              }}
              onBlur={() => {
                if (sourceDraft.trim()) {
                  addValue('source', sourceDraft.trim())
                  setSourceDraft('')
                }
              }}
              placeholder="referrer host ⏎"
              className={inputCls}
            />
          </label>

          {/* UTM source — add on Enter/blur (multi). */}
          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
            UTM src
            <input
              value={utmDraft}
              onChange={(e) => setUtmDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && utmDraft.trim()) {
                  addValue('utm_source', utmDraft.trim())
                  setUtmDraft('')
                }
              }}
              onBlur={() => {
                if (utmDraft.trim()) {
                  addValue('utm_source', utmDraft.trim())
                  setUtmDraft('')
                }
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
