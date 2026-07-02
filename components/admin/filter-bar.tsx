'use client'

// Phase 10.4.7 → Phase 14 — global smart filter bar (multi-value).
// Phase 14b Wave 2 — dimensions v2: "+ Add filter" menu (person / page / city /
//   region / browser / OS / data-source / session / event-property) and an =/≠
//   toggle on every negatable chip.
//
// URL-state only (shareable/bookmarkable): every control reads from and writes
// to searchParams via router.replace, so the server page re-renders with the new
// filters and back/forward works. Parsing + sanitization live in
// lib/admin/filters.ts (parseAdminFilters); the bar never interprets values.
//
// Dimension filters are MULTI-VALUE — each optional param holds a comma list
// (e.g. ?country=IN,US). Negations live in parallel `<param>_not` params; the
// shared SQL predicate (migration 185) applies them per key. Every selected
// value shows as a removable chip; clicking the =/≠ glyph flips the value
// between the positive and negated param.

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Bot, Plus, SlidersHorizontal, X } from 'lucide-react'
import { RangePicker } from '@/components/admin/range-picker'
import { CohortPicker } from '@/components/admin/cohort-picker'
import type { RangeKey } from '@/lib/admin/range'
import {
  BROWSER_OPTIONS,
  DEVICE_OPTIONS,
  NOT_FILTER_PARAMS,
  OPTIONAL_FILTER_PARAMS,
  OS_OPTIONS,
  SOURCE_KIND_OPTIONS,
} from '@/lib/admin/filters'
import { KNOWN_PROP_KEYS } from '@/lib/analytics-schema'

const PARAM_LABELS: Record<string, string> = {
  device: 'Device',
  country: 'Country',
  source: 'Source',
  utm_source: 'UTM source',
  utm_medium: 'UTM medium',
  utm_campaign: 'UTM campaign',
  auth: 'Auth',
  event: 'Event',
  path: 'Page',
  city: 'City',
  region: 'Region',
  browser: 'Browser',
  os: 'OS',
  source_kind: 'Data source',
  session: 'Session',
  prop: 'Property',
  person: 'Person',
}

/** Params whose chips can flip between = and ≠ (`<param>_not` exists). */
const NEGATABLE = new Set(NOT_FILTER_PARAMS.map((k) => k.replace(/_not$/, '')))

/** The "+ Add filter" menu — extra dimensions beyond the always-visible row. */
const ADD_MENU: Array<{ key: string; label: string; hint: string }> = [
  { key: 'person', label: 'Person', hint: 'email or visitor/user ID' },
  { key: 'path', label: 'Page', hint: 'path contains, e.g. /tools/notion' },
  { key: 'city', label: 'City', hint: 'e.g. Mumbai' },
  { key: 'region', label: 'Region', hint: 'state/region code' },
  { key: 'browser', label: 'Browser', hint: '' },
  { key: 'os', label: 'OS', hint: '' },
  { key: 'source_kind', label: 'Data source', hint: 'client or server events' },
  { key: 'session', label: 'Session ID', hint: 'a single browsing session' },
  { key: 'prop', label: 'Event property', hint: 'property = value' },
  { key: 'utm_source', label: 'UTM source', hint: '' },
  { key: 'utm_medium', label: 'UTM medium', hint: '' },
  { key: 'utm_campaign', label: 'UTM campaign', hint: '' },
]

const selectCls =
  'bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-700'
const inputCls =
  'bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-700 w-36'

export function FilterBar({
  activeRange,
  countries,
  eventNames,
  showRange = true,
}: {
  activeRange: RangeKey
  countries: string[]
  eventNames: string[]
  /** Live has a fixed 5-min window — it mounts the bar without the RangePicker. */
  showRange?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(
    // Discoverability: default OPEN when the page offers dimension filters (else
    // "I can't filter by geo" was really "I couldn't find the collapsed panel").
    OPTIONAL_FILTER_PARAMS.some((k) => !!params.get(k)) ||
      NOT_FILTER_PARAMS.some((k) => !!params.get(k)) ||
      countries.length > 0 ||
      eventNames.length > 0,
  )
  const [sourceDraft, setSourceDraft] = useState('')
  const [eventDraft, setEventDraft] = useState('')
  // "+ Add filter": which extra dimension's input row is showing.
  const [addDim, setAddDim] = useState<string>('')
  const [addDraft, setAddDraft] = useState('')
  const [propKeyDraft, setPropKeyDraft] = useState('')

  const includeBots = params.get('bots') === '1' || params.get('include_bots') === '1'
  // total selected values across all optional dimensions (for the badge)
  const activeCount =
    OPTIONAL_FILTER_PARAMS.reduce((n, k) => n + listOf(k).length, 0) +
    NOT_FILTER_PARAMS.reduce((n, k) => n + listOf(k).length, 0)

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

  /** Flip one value between `key` and `key_not` (the =/≠ chip toggle). */
  function toggleNegate(key: string, v: string) {
    const isNot = key.endsWith('_not')
    const from = key
    const to = isNot ? key.replace(/_not$/, '') : `${key}_not`
    const sp = new URLSearchParams(params.toString())
    const fromVals = listOf(from).filter((x) => x !== v)
    const toVals = [...new Set([...listOf(to), v])]
    if (fromVals.length) sp.set(from, fromVals.join(','))
    else sp.delete(from)
    sp.set(to, toVals.join(','))
    navigate(sp)
  }

  /** Single-value set (auth / person). */
  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set(key, value)
    else sp.delete(key)
    navigate(sp)
  }

  function clearAll() {
    const sp = new URLSearchParams(params.toString())
    for (const k of OPTIONAL_FILTER_PARAMS) sp.delete(k)
    for (const k of NOT_FILTER_PARAMS) sp.delete(k)
    setSourceDraft('')
    setEventDraft('')
    setAddDim('')
    setAddDraft('')
    setPropKeyDraft('')
    navigate(sp)
  }

  function toggleBots() {
    const sp = new URLSearchParams(params.toString())
    sp.delete('include_bots') // migrate the legacy param on first toggle
    if (includeBots) sp.delete('bots')
    else sp.set('bots', '1')
    navigate(sp)
  }

  /** Commit the "+ Add filter" draft for the currently-selected dimension. */
  function commitAdd() {
    const v = addDraft.trim()
    if (!addDim) return
    if (addDim === 'person') {
      if (v) setParam('person', v)
    } else if (addDim === 'prop') {
      const k = propKeyDraft.trim().toLowerCase()
      if (k && v) addValue('prop', `${k}:${v}`)
      setPropKeyDraft('')
    } else if (v) {
      addValue(addDim, v)
    }
    setAddDraft('')
  }

  const deviceSel = listOf('device')
  const chipParams: string[] = [
    ...OPTIONAL_FILTER_PARAMS.filter((k) => k !== 'auth'),
    ...NOT_FILTER_PARAMS,
  ]

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <CohortPicker />
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
        {showRange && <RangePicker active={activeRange} />}
      </div>

      {/* Active-value chips — one per selected value; =/≠ toggle + remove. */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {chipParams.flatMap((k) => {
            const isNot = k.endsWith('_not')
            const base = isNot ? k.replace(/_not$/, '') : k
            const negatable = NEGATABLE.has(base)
            return listOf(k).map((v) => (
              <span
                key={`${k}:${v}`}
                className={`group flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                  isNot
                    ? 'border-rose-800/60 bg-rose-950/30 text-rose-300'
                    : 'border-emerald-800/60 bg-emerald-950/30 text-emerald-300'
                }`}
              >
                <span className={isNot ? 'text-rose-500/80' : 'text-emerald-500/80'}>{PARAM_LABELS[base] ?? base}</span>
                {negatable ? (
                  <button
                    type="button"
                    onClick={() => toggleNegate(k, v)}
                    title={isNot ? 'Change to “is” (=)' : 'Change to “is not” (≠)'}
                    className="font-mono font-bold hover:scale-125 transition-transform"
                  >
                    {isNot ? '≠' : '='}
                  </button>
                ) : (
                  <span className="font-mono">:</span>
                )}
                <span className="font-medium">{v}</span>
                <button
                  type="button"
                  onClick={() => removeValue(k, v)}
                  aria-label={`Remove ${PARAM_LABELS[base] ?? base}: ${v}`}
                >
                  <X className={`h-2.5 w-2.5 ${isNot ? 'text-rose-500 group-hover:text-rose-200' : 'text-emerald-500 group-hover:text-emerald-200'}`} />
                </button>
              </span>
            ))
          })}
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

          {/* + Add filter — every additional dimension lives here. */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-0.5">
              <Plus className="h-3 w-3" /> Add
            </span>
            <select
              value={addDim}
              onChange={(e) => {
                setAddDim(e.target.value)
                setAddDraft('')
                setPropKeyDraft('')
              }}
              className={selectCls}
            >
              <option value="">filter…</option>
              {ADD_MENU.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>

            {addDim === 'browser' || addDim === 'os' || addDim === 'source_kind' ? (
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) addValue(addDim, e.target.value)
                }}
                className={selectCls}
              >
                <option value="">add…</option>
                {(addDim === 'browser' ? BROWSER_OPTIONS : addDim === 'os' ? OS_OPTIONS : SOURCE_KIND_OPTIONS)
                  .filter((o) => !listOf(addDim).includes(o))
                  .map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
              </select>
            ) : addDim === 'prop' ? (
              <>
                <input
                  list="filter-bar-prop-keys"
                  value={propKeyDraft}
                  onChange={(e) => setPropKeyDraft(e.target.value)}
                  placeholder="property"
                  className={`${inputCls} w-32`}
                />
                <datalist id="filter-bar-prop-keys">
                  {[...KNOWN_PROP_KEYS].sort().map((k) => (
                    <option key={k} value={k} />
                  ))}
                </datalist>
                <span className="text-zinc-600 text-xs">=</span>
                <input
                  value={addDraft}
                  onChange={(e) => setAddDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitAdd()
                  }}
                  placeholder="value ⏎"
                  className={`${inputCls} w-32`}
                />
              </>
            ) : addDim ? (
              <input
                value={addDraft}
                onChange={(e) => setAddDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAdd()
                }}
                onBlur={commitAdd}
                placeholder={`${ADD_MENU.find((m) => m.key === addDim)?.hint || 'value'} ⏎`}
                className={`${inputCls} w-48`}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
