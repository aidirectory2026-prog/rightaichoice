// Phase 10.4.5 (2026-06-12) — the global smart-filter contract.
// Phase 14b Wave 2 (2026-07-02) — dimensions v2: page/city/region/browser/os/
//   source_kind/session/props + negation (`not`).
//
// ONE definition of what every admin filter means, mirrored in exactly two
// places that the filter-matrix verifier (scripts/audit/verify-filters.ts)
// proves equivalent:
//   1. SQL  — public.insights_apply_filters(ue user_events, f jsonb)
//             (migrations 154 → 181 → 185), called by every filter-aware RPC
//             via the `p_filters jsonb default null` parameter.
//   2. TS   — applyFilters() below, for direct PostgREST user_events selects.
//
// SEMANTICS (keep this table in sync with migration 185 — the verifier
// asserts it):
//   device       'desktop'|'mobile'|'tablet' → device_type = value
//                'unknown'                   → device_type IS NULL
//   country      country = value (ISO-3166 alpha-2 as stored, e.g. 'IN')
//   source       referrer ILIKE '%' || value || '%' (hostname charset)
//   utm_source / utm_medium / utm_campaign — equality on the dedicated columns
//   auth         'known' → user_id IS NOT NULL; 'anon' → user_id IS NULL
//   event        event_name = value
//   page_path    page_path ILIKE '%' || value || '%' (path charset)
//   city         city = value        region     region = value
//   browser      browser = value     os         os = value   (migration 184)
//   source_kind  source_kind = value ('client'|'server')
//   session_id   properties->>'session_id' = value
//   props        [{k,v}] — properties->>k = v for EVERY pair (k allowlisted
//                against KNOWN_PROP_KEYS + charset-checked: the PostgREST
//                mirror interpolates k into a column expression)
//   not          object of any dimensions above → row must NOT match it.
//                NULL-dimension rows are excluded by ≠ (SQL three-valued
//                logic on both sides — that's what keeps them equivalent).
//
// Every dimension accepts a scalar or an array (IN / OR-within-dimension).
// Range + bots are NOT part of the jsonb payload — they remain the existing
// p_cutoff/p_end/p_include_bots RPC params (Phase 2 baseline depends on
// their exact behavior).

import { parseRange, type RangeSelection } from '@/lib/admin/range'
import { KNOWN_PROP_KEYS } from '@/lib/analytics-schema'

/** The negatable dimensions (everything equality/contains-like; no auth —
 *  auth is a binary, its negation is the other value). */
export type NotFilters = {
  device?: string | string[]
  country?: string | string[]
  source?: string | string[]
  utmSource?: string | string[]
  utmMedium?: string | string[]
  utmCampaign?: string | string[]
  event?: string | string[]
  pagePath?: string | string[]
  city?: string | string[]
  region?: string | string[]
  browser?: string | string[]
  os?: string | string[]
}

export type AdminFilters = {
  range: RangeSelection
  includeBots: boolean
  // Phase 14: dimensions accept a single value (back-compat) OR an array
  // (multi-value / IN — "India AND US"). A single selection stays a scalar so
  // the emitted jsonb is byte-identical to the pre-Phase-14 shape.
  device?: string | string[]
  country?: string | string[]
  source?: string | string[]
  utmSource?: string | string[]
  utmMedium?: string | string[]
  utmCampaign?: string | string[]
  auth?: 'known' | 'anon'
  event?: string | string[]
  // Wave 2 dimensions
  pagePath?: string | string[]
  city?: string | string[]
  region?: string | string[]
  browser?: string | string[]
  os?: string | string[]
  sourceKind?: string | string[]
  sessionId?: string | string[]
  /** Event-property equality pairs — ALL must match. */
  props?: Array<{ k: string; v: string }>
  /** Negations — the row must NOT match this object. */
  not?: NotFilters
  // Cohort-as-filter (Wave 3): a resolved cohort's distinct_id set. When set,
  // rows are constrained to these ids (the shared SQL predicate ANDs it in).
  distinctIds?: string[]
  /** UI metadata for the person pin (lib/admin/person-filter.ts) — NOT
   *  serialized to jsonb; distinctIds carries the actual constraint. */
  personMeta?: { query: string; resolved: number; label: string | null }
}

export const DEVICE_OPTIONS = ['desktop', 'mobile', 'tablet', 'unknown'] as const
export const AUTH_OPTIONS = ['known', 'anon'] as const
export const SOURCE_KIND_OPTIONS = ['client', 'server'] as const
export const BROWSER_OPTIONS = ['chrome', 'safari', 'firefox', 'edge', 'opera', 'samsung'] as const
export const OS_OPTIONS = ['ios', 'android', 'windows', 'macos', 'chromeos', 'linux'] as const

/** Positive optional filter keys (everything beyond range+bots), URL form. */
export const OPTIONAL_FILTER_PARAMS = [
  'device',
  'country',
  'source',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'auth',
  'event',
  'path',
  'city',
  'region',
  'browser',
  'os',
  'source_kind',
  'session',
  'prop',
  'person',
] as const

/** URL params holding negated values (chip ≠ state). */
export const NOT_FILTER_PARAMS = [
  'device_not',
  'country_not',
  'source_not',
  'utm_source_not',
  'utm_medium_not',
  'utm_campaign_not',
  'event_not',
  'path_not',
  'city_not',
  'region_not',
  'browser_not',
  'os_not',
] as const

const MAX_LEN = 120

/** Generic text sanitizer: trim, strip control chars + ilike wildcards +
 *  commas (comma is the multi-value separator), cap length. */
function cleanText(v: string | undefined, max = MAX_LEN): string | undefined {
  if (!v) return undefined
  // eslint-disable-next-line no-control-regex
  const out = v.replace(/[\x00-\x1f\x7f%,]/g, '').trim().slice(0, max)
  return out || undefined
}

/** Hostname-ish sanitizer for the `source` contains-match: lowercase,
 *  keep only [a-z0-9.-] so the value can never carry SQL/ilike wildcards. */
function cleanHost(v: string | undefined): string | undefined {
  if (!v) return undefined
  const out = v.toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 100)
  return out || undefined
}

/** Path charset for the page contains-match — no wildcards possible. */
function cleanPath(v: string | undefined): string | undefined {
  if (!v) return undefined
  const out = v.toLowerCase().replace(/[^a-z0-9/_.-]/g, '').slice(0, 200)
  return out || undefined
}

/** Event names are snake_case identifiers. */
function cleanEventName(v: string | undefined): string | undefined {
  if (!v) return undefined
  const out = v.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 64)
  return out || undefined
}

/** Countries are stored as ISO alpha-2 codes ('IN', 'US', 'SG'). */
function cleanCountry(v: string | undefined): string | undefined {
  if (!v) return undefined
  const out = v.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
  return out.length === 2 ? out : undefined
}

/** browser/os are lowercase family names from lib/ua-parse.ts. */
function cleanFamily(v: string | undefined): string | undefined {
  if (!v) return undefined
  const out = v.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 20)
  return out || undefined
}

/** session ids are uuid-ish. */
function cleanSessionId(v: string | undefined): string | undefined {
  if (!v) return undefined
  const out = v.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 64)
  return out || undefined
}

/**
 * Parse a possibly-multi-value URL param (comma-separated, e.g. "IN,US") into a
 * scalar (single) or array (many), each element run through `clean` and
 * deduped. Single value stays a scalar → identical jsonb to the pre-Phase-14
 * shape (which the filter-matrix verifier proved equivalent). Empty → undefined.
 */
function parseMulti(
  raw: string | undefined,
  clean: (v: string | undefined) => string | undefined,
): string | string[] | undefined {
  if (!raw) return undefined
  const vals = raw
    .split(',')
    .map((s) => clean(s))
    .filter((v): v is string => !!v)
  // Cap at 8 values per dimension: the inlined SQL predicate (migration 190)
  // unrolls the contains-dims (source/page_path) to 8 fixed slots, and 8 is
  // already past any sane chip count.
  const uniq = [...new Set(vals)].slice(0, 8)
  if (uniq.length === 0) return undefined
  return uniq.length === 1 ? uniq[0] : uniq
}

/** `prop` URL param: comma list of key:value pairs. Keys must be schema-known
 *  (KNOWN_PROP_KEYS) AND identifier-charset — the PostgREST mirror builds a
 *  `properties->>key` column expression from them. Values are exact-match. */
export function parsePropPairs(raw: string | undefined): Array<{ k: string; v: string }> | undefined {
  if (!raw) return undefined
  const out: Array<{ k: string; v: string }> = []
  for (const part of raw.split(',')) {
    const i = part.indexOf(':')
    if (i <= 0) continue
    const k = part.slice(0, i).trim().toLowerCase()
    const v = cleanText(part.slice(i + 1), 200)
    if (!/^[a-z0-9_]{1,64}$/.test(k)) continue
    if (!KNOWN_PROP_KEYS.has(k)) continue
    if (v === undefined) continue
    out.push({ k, v })
  }
  return out.length ? out.slice(0, 8) : undefined
}

/**
 * Parse the full admin filter state from a searchParams record.
 * Range handling wraps parseRange() — same `range|from|to` (+legacy `days`)
 * convention every admin page already uses. Bots: `bots=1` (or the legacy
 * `include_bots=1`) means INCLUDE bot traffic; default is humans-only.
 */
export function parseAdminFilters(sp: Record<string, string | undefined>): AdminFilters {
  const range = parseRange(sp)
  const includeBots = sp.bots === '1' || sp.include_bots === '1'

  const cleanDevice = (v: string | undefined) => (DEVICE_OPTIONS.includes(v as never) ? v : undefined)
  const auth = AUTH_OPTIONS.includes(sp.auth as never) ? (sp.auth as 'known' | 'anon') : undefined

  const not: NotFilters = {}
  const setNot = <K extends keyof NotFilters>(key: K, v: string | string[] | undefined) => {
    if (v !== undefined) not[key] = v
  }
  setNot('device', parseMulti(sp.device_not, cleanDevice))
  setNot('country', parseMulti(sp.country_not, cleanCountry))
  setNot('source', parseMulti(sp.source_not, cleanHost))
  setNot('utmSource', parseMulti(sp.utm_source_not, cleanText))
  setNot('utmMedium', parseMulti(sp.utm_medium_not, cleanText))
  setNot('utmCampaign', parseMulti(sp.utm_campaign_not, cleanText))
  setNot('event', parseMulti(sp.event_not, cleanEventName))
  setNot('pagePath', parseMulti(sp.path_not, cleanPath))
  setNot('city', parseMulti(sp.city_not, cleanText))
  setNot('region', parseMulti(sp.region_not, cleanText))
  setNot('browser', parseMulti(sp.browser_not, cleanFamily))
  setNot('os', parseMulti(sp.os_not, cleanFamily))

  return {
    range,
    includeBots,
    device: parseMulti(sp.device, cleanDevice),
    country: parseMulti(sp.country, cleanCountry),
    source: parseMulti(sp.source, cleanHost),
    utmSource: parseMulti(sp.utm_source, cleanText),
    utmMedium: parseMulti(sp.utm_medium, cleanText),
    utmCampaign: parseMulti(sp.utm_campaign, cleanText),
    auth,
    event: parseMulti(sp.event, cleanEventName),
    pagePath: parseMulti(sp.path, cleanPath),
    city: parseMulti(sp.city, cleanText),
    region: parseMulti(sp.region, cleanText),
    browser: parseMulti(sp.browser, cleanFamily),
    os: parseMulti(sp.os, cleanFamily),
    sourceKind: parseMulti(sp.source_kind, (v) => (SOURCE_KIND_OPTIONS.includes(v as never) ? v : undefined)),
    sessionId: parseMulti(sp.session, cleanSessionId),
    props: parsePropPairs(sp.prop),
    not: Object.keys(not).length ? not : undefined,
  }
}

export type FiltersJsonb = {
  device?: string | string[]
  country?: string | string[]
  source?: string | string[]
  utm_source?: string | string[]
  utm_medium?: string | string[]
  utm_campaign?: string | string[]
  auth?: 'known' | 'anon'
  event?: string | string[]
  page_path?: string | string[]
  city?: string | string[]
  region?: string | string[]
  browser?: string | string[]
  os?: string | string[]
  source_kind?: string | string[]
  session_id?: string | string[]
  props?: Array<{ k: string; v: string }>
  not?: Omit<FiltersJsonb, 'not' | 'props' | 'distinct_ids' | 'auth' | 'session_id' | 'source_kind'>
  distinct_ids?: string[]
}

/**
 * Serialize the optional filters for the `p_filters jsonb` RPC parameter.
 * Returns NULL when no optional filter is set so the RPCs hit their null
 * fast-path and behave byte-for-byte like the Phase 2 baseline.
 *
 * `dropEvent`: charts that are already pinned to a single event (e.g.
 * "page views by device" hard-codes page_viewed) pass true so a global
 * event filter doesn't AND with the pin and silently zero the tile.
 */
export function filtersToJsonb(
  f: AdminFilters,
  opts?: { dropEvent?: boolean },
): FiltersJsonb | null {
  const out: FiltersJsonb = {}
  // Scalar or array pass straight through — the shared SQL predicate
  // (migration 185) branches on jsonb_typeof per key.
  if (has(f.device)) out.device = f.device
  if (has(f.country)) out.country = f.country
  if (has(f.source)) out.source = f.source
  if (has(f.utmSource)) out.utm_source = f.utmSource
  if (has(f.utmMedium)) out.utm_medium = f.utmMedium
  if (has(f.utmCampaign)) out.utm_campaign = f.utmCampaign
  if (f.auth) out.auth = f.auth
  if (has(f.event) && !opts?.dropEvent) out.event = f.event
  if (has(f.pagePath)) out.page_path = f.pagePath
  if (has(f.city)) out.city = f.city
  if (has(f.region)) out.region = f.region
  if (has(f.browser)) out.browser = f.browser
  if (has(f.os)) out.os = f.os
  if (has(f.sourceKind)) out.source_kind = f.sourceKind
  if (has(f.sessionId)) out.session_id = f.sessionId
  if (f.props && f.props.length) out.props = f.props
  if (f.not) {
    const n: NonNullable<FiltersJsonb['not']> = {}
    if (has(f.not.device)) n.device = f.not.device
    if (has(f.not.country)) n.country = f.not.country
    if (has(f.not.source)) n.source = f.not.source
    if (has(f.not.utmSource)) n.utm_source = f.not.utmSource
    if (has(f.not.utmMedium)) n.utm_medium = f.not.utmMedium
    if (has(f.not.utmCampaign)) n.utm_campaign = f.not.utmCampaign
    if (has(f.not.event) && !opts?.dropEvent) n.event = f.not.event
    if (has(f.not.pagePath)) n.page_path = f.not.pagePath
    if (has(f.not.city)) n.city = f.not.city
    if (has(f.not.region)) n.region = f.not.region
    if (has(f.not.browser)) n.browser = f.not.browser
    if (has(f.not.os)) n.os = f.not.os
    if (Object.keys(n).length) out.not = n
  }
  if (f.distinctIds && f.distinctIds.length) out.distinct_ids = f.distinctIds
  return Object.keys(out).length > 0 ? out : null
}

/** A dimension value is "set" if it's a non-empty scalar or a non-empty array. */
function has(v: string | string[] | undefined): boolean {
  return Array.isArray(v) ? v.length > 0 : !!v
}

/** Count of active optional filters — drives the filter-bar badge. */
export function activeFilterCount(f: AdminFilters): number {
  return (filtersToJsonb(f) && Object.keys(filtersToJsonb(f)!).length) || 0
}

// Minimal structural type for a PostgREST filter builder — lets applyFilters
// stay generic over count-head queries and row selects without `any` at the
// call sites.
export interface PostgrestFilterable {
  eq(column: string, value: unknown): this
  is(column: string, value: null): this
  not(column: string, operator: string, value: unknown): this
  ilike(column: string, pattern: string): this
  in(column: string, values: readonly unknown[]): this
  or(filters: string): this
}

/**
 * PostgREST mirror of public.insights_apply_filters() — apply the SAME
 * predicates to a direct user_events select. The filter-matrix verifier
 * proves both implementations return identical counts; if you change one
 * side, change the other and re-run `npm run tracking:filters`.
 *
 * NOTE on `source`/`page_path`: SQL uses ilike-contains; here we use
 * .ilike(col, `%v%`) — same semantics. Values are pre-sanitized so they can
 * never inject pattern metacharacters.
 */
export function applyFilters<T extends PostgrestFilterable>(
  q: T,
  f: AdminFilters,
  opts?: { dropEvent?: boolean },
): T {
  // device: 'unknown' means device_type IS NULL. Array may mix real devices
  // with 'unknown' → (device_type IN (...) OR device_type IS NULL).
  if (has(f.device)) {
    const arr = asArray(f.device)
    const hasUnknown = arr.includes('unknown')
    const known = arr.filter((d) => d !== 'unknown')
    if (hasUnknown && known.length) {
      q = q.or(`device_type.in.(${known.join(',')}),device_type.is.null`)
    } else if (hasUnknown) {
      q = q.is('device_type', null)
    } else if (known.length === 1) {
      q = q.eq('device_type', known[0])
    } else {
      q = q.in('device_type', known)
    }
  }
  q = eqOrIn(q, 'country', f.country)
  // source: ILIKE-contains; array = OR across values. Values are pre-sanitized
  // to [a-z0-9.-] so they carry no wildcard metacharacters. In a PostgREST
  // .or() the ilike wildcard is '*' (not '%').
  if (has(f.source)) {
    const arr = asArray(f.source)
    q = arr.length === 1 ? q.ilike('referrer', `%${arr[0]}%`) : q.or(arr.map((s) => `referrer.ilike.*${s}*`).join(','))
  }
  q = eqOrIn(q, 'utm_source', f.utmSource)
  q = eqOrIn(q, 'utm_medium', f.utmMedium)
  q = eqOrIn(q, 'utm_campaign', f.utmCampaign)
  if (f.auth === 'known') q = q.not('user_id', 'is', null)
  if (f.auth === 'anon') q = q.is('user_id', null)
  if (has(f.event) && !opts?.dropEvent) q = eqOrIn(q, 'event_name', f.event)
  // ── Wave 2 dimensions ──────────────────────────────────────────────
  if (has(f.pagePath)) {
    const arr = asArray(f.pagePath)
    q = arr.length === 1 ? q.ilike('page_path', `%${arr[0]}%`) : q.or(arr.map((p) => `page_path.ilike.*${p}*`).join(','))
  }
  q = eqOrIn(q, 'city', f.city)
  q = eqOrIn(q, 'region', f.region)
  q = eqOrIn(q, 'browser', f.browser)
  q = eqOrIn(q, 'os', f.os)
  q = eqOrIn(q, 'source_kind', f.sourceKind)
  q = eqOrIn(q, 'properties->>session_id', f.sessionId)
  // props: keys were allowlisted + charset-checked at parse time — they're
  // the only user input that reaches a column-expression position.
  for (const p of f.props ?? []) q = q.eq(`properties->>${p.k}`, p.v)
  // ── negations (must stay equivalent to the SQL `not` blocks) ──
  if (f.not) {
    q = notEqOrIn(q, 'country', f.not.country)
    q = notEqOrIn(q, 'utm_source', f.not.utmSource)
    q = notEqOrIn(q, 'utm_medium', f.not.utmMedium)
    q = notEqOrIn(q, 'utm_campaign', f.not.utmCampaign)
    // dropEvent must gate the NEGATED event too — filtersToJsonb drops it for
    // event-pinned tiles, and an ungated mirror would compute
    // `event_name = X AND event_name != X` → hard zero (tile inconsistency).
    if (!opts?.dropEvent) q = notEqOrIn(q, 'event_name', f.not.event)
    q = notEqOrIn(q, 'city', f.not.city)
    q = notEqOrIn(q, 'region', f.not.region)
    q = notEqOrIn(q, 'browser', f.not.browser)
    q = notEqOrIn(q, 'os', f.not.os)
    // device ≠: 'unknown' → NOT NULL; real value → not-eq (NULL rows drop out
    // by three-valued logic on the SQL side; PostgREST not.eq matches that).
    if (has(f.not.device)) {
      const arr = asArray(f.not.device)
      const hasUnknown = arr.includes('unknown')
      const known = arr.filter((d) => d !== 'unknown')
      if (hasUnknown) q = q.not('device_type', 'is', null)
      if (known.length === 1) q = q.not('device_type', 'eq', known[0])
      else if (known.length > 1) q = q.not('device_type', 'in', `(${known.join(',')})`)
    }
    // contains-negations: NOT(any ilike) = every NOT ilike — chain .not calls.
    for (const s of asArray(f.not.source)) q = q.not('referrer', 'ilike', `%${s}%`)
    for (const p of asArray(f.not.pagePath)) q = q.not('page_path', 'ilike', `%${p}%`)
  }
  if (f.distinctIds && f.distinctIds.length) q = q.in('distinct_id', f.distinctIds)
  return q
}

function asArray(v: string | string[] | undefined): string[] {
  return v == null ? [] : Array.isArray(v) ? v : [v]
}

/** Apply `.eq` for a scalar / single-element array, `.in` for a multi array. */
function eqOrIn<T extends PostgrestFilterable>(q: T, column: string, v: string | string[] | undefined): T {
  if (!has(v)) return q
  const arr = asArray(v)
  return arr.length === 1 ? (q.eq(column, arr[0]) as T) : (q.in(column, arr) as T)
}

/** Negated eq/in — SQL `not (col = v)` / `not (col in (...))`; NULL rows are
 *  excluded on both sides (three-valued logic ↔ PostgREST not.eq). */
function notEqOrIn<T extends PostgrestFilterable>(q: T, column: string, v: string | string[] | undefined): T {
  if (!has(v)) return q
  const arr = asArray(v)
  return arr.length === 1
    ? (q.not(column, 'eq', arr[0]) as T)
    : (q.not(column, 'in', `(${arr.join(',')})`) as T)
}

/** Convenience: build an AdminFilters with only range+bots (no optional
 *  filters) — used by callers that haven't adopted the filter bar yet and
 *  by the baseline snapshot script. */
export function baseFilters(range: RangeSelection, includeBots: boolean): AdminFilters {
  return { range, includeBots }
}
