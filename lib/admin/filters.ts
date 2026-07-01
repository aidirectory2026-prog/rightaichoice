// Phase 10.4.5 (2026-06-12) — the global smart-filter contract.
//
// ONE definition of what every admin filter means, mirrored in exactly two
// places that the filter-matrix verifier (scripts/audit/verify-filters.ts)
// proves equivalent:
//   1. SQL  — public.insights_apply_filters(ue user_events, f jsonb)
//             (migration 154), called by every filter-aware RPC via the
//             `p_filters jsonb default null` parameter.
//   2. TS   — applyFilters() below, for direct PostgREST user_events selects.
//
// SEMANTICS (keep this table in sync with migration 154 — the verifier
// asserts it):
//   device       'desktop'|'mobile'|'tablet' → device_type = value
//                'unknown'                   → device_type IS NULL
//                (server-emitted events have NULL device_type; the
//                events-by-device RPC displays them as "unknown")
//   country      country = value (ISO-3166 alpha-2 as stored, e.g. 'IN')
//   source       referrer ILIKE '%' || value || '%' — value sanitized to a
//                hostname charset. PostgREST cannot extract a URL host, so
//                BOTH sides use the same ilike-contains semantics on the
//                raw referrer to stay provably equivalent.
//   utm_source   utm_source = value     ← TOP-LEVEL COLUMN, deliberately.
//   utm_medium   utm_medium = value        The capture pipeline writes UTM
//   utm_campaign utm_campaign = value      params to dedicated columns on
//                user_events; properties->>'utm_*' has ZERO rows in the
//                live DB (verified 2026-06-12). Filtering on properties
//                would be a permanently-dead filter.
//   auth         'known' → user_id IS NOT NULL; 'anon' → user_id IS NULL
//   event        event_name = value
//
// Range + bots are NOT part of the jsonb payload — they remain the existing
// p_cutoff/p_end/p_include_bots RPC params (Phase 2 baseline depends on
// their exact behavior).

import { parseRange, type RangeSelection } from '@/lib/admin/range'

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
  // Cohort-as-filter (Wave 3): a resolved cohort's distinct_id set. When set,
  // rows are constrained to these ids (the shared SQL predicate ANDs it in).
  distinctIds?: string[]
}

export const DEVICE_OPTIONS = ['desktop', 'mobile', 'tablet', 'unknown'] as const
export const AUTH_OPTIONS = ['known', 'anon'] as const

/** Optional filter keys (everything beyond range+bots), in URL-param form. */
export const OPTIONAL_FILTER_PARAMS = [
  'device',
  'country',
  'source',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'auth',
  'event',
] as const

const MAX_LEN = 120

/** Generic text sanitizer: trim, strip control chars, cap length. */
function cleanText(v: string | undefined, max = MAX_LEN): string | undefined {
  if (!v) return undefined
  // eslint-disable-next-line no-control-regex
  const out = v.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, max)
  return out || undefined
}

/** Hostname-ish sanitizer for the `source` contains-match: lowercase,
 *  keep only [a-z0-9.-] so the value can never carry SQL/ilike wildcards. */
function cleanHost(v: string | undefined): string | undefined {
  if (!v) return undefined
  const out = v.toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 100)
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
  const uniq = [...new Set(vals)]
  if (uniq.length === 0) return undefined
  return uniq.length === 1 ? uniq[0] : uniq
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

  const device = parseMulti(sp.device, (v) => (DEVICE_OPTIONS.includes(v as never) ? v : undefined))
  const auth = AUTH_OPTIONS.includes(sp.auth as never) ? (sp.auth as 'known' | 'anon') : undefined

  return {
    range,
    includeBots,
    device,
    country: parseMulti(sp.country, cleanCountry),
    source: parseMulti(sp.source, cleanHost),
    utmSource: parseMulti(sp.utm_source, cleanText),
    utmMedium: parseMulti(sp.utm_medium, cleanText),
    utmCampaign: parseMulti(sp.utm_campaign, cleanText),
    auth,
    event: parseMulti(sp.event, cleanEventName),
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
  // (migration 181) branches on jsonb_typeof per key.
  if (has(f.device)) out.device = f.device
  if (has(f.country)) out.country = f.country
  if (has(f.source)) out.source = f.source
  if (has(f.utmSource)) out.utm_source = f.utmSource
  if (has(f.utmMedium)) out.utm_medium = f.utmMedium
  if (has(f.utmCampaign)) out.utm_campaign = f.utmCampaign
  if (f.auth) out.auth = f.auth
  if (has(f.event) && !opts?.dropEvent) out.event = f.event
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
 * NOTE on `source`: SQL uses `referrer ilike '%'||source||'%'`; here we use
 * .ilike('referrer', `%${source}%`) — same contains semantics. The value is
 * pre-sanitized to [a-z0-9.-] by parseAdminFilters so it can never inject
 * pattern metacharacters.
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

/** Convenience: build an AdminFilters with only range+bots (no optional
 *  filters) — used by callers that haven't adopted the filter bar yet and
 *  by the baseline snapshot script. */
export function baseFilters(range: RangeSelection, includeBots: boolean): AdminFilters {
  return { range, includeBots }
}
