/**
 * Phase 10.4.8 (2026-06-12) — Filter-matrix verifier (verification mean #6).
 *
 * THE PROOF that the global smart filters are correct: for a matrix of
 * filter combinations over the PINNED audit week, each combo is computed
 * through BOTH live paths and through independent hand-written raw SQL,
 * and the numbers must match EXACTLY:
 *
 *   A. RPC path      — distinct_visitors_in_window(..., p_filters) i.e. the
 *                      shared SQL predicate insights_apply_filters()
 *                      (migration 154) that every filter-aware RPC uses.
 *   B. Direct path   — page_viewed count via a PostgREST select with the
 *                      applyFilters() TS mirror (lib/admin/filters.ts),
 *                      exactly as the insights page builds it.
 *   vs. hand-written WHERE clauses sent through _admin_audit_exec —
 *   independent literals, NOT calling insights_apply_filters, so a bug in
 *   the shared predicate cannot hide.
 *
 * Window is pinned (2026-06-01 .. 2026-06-07 IST, end-exclusive) so every
 * run is reproducible against immutable data.
 *
 * USAGE:
 *   npm run tracking:filters                 # verify, print matrix
 *   npm run tracking:filters -- --write-doc  # also refresh docs/admin/filter-matrix.md
 *
 * Exit 1 on ANY mismatch.
 */
export {}

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import type { RangeSelection } from '@/lib/admin/range'
import { applyFilters, filtersToJsonb, type AdminFilters } from '@/lib/admin/filters'

// ── Pinned window (same as snapshot-admin-metrics.ts) ──────────────────────
const FROM_ISO = new Date('2026-06-01T00:00:00+05:30').toISOString()
const TO_ISO = new Date('2026-06-08T00:00:00+05:30').toISOString()

const SEL: RangeSelection = {
  key: 'custom',
  cutoffISO: FROM_ISO,
  endCutoffISO: TO_ISO,
  label: '2026-06-01 → 2026-06-07',
  calendarAnchored: true,
  days: 7,
}

type Combo = {
  name: string
  includeBots: boolean
  // Phase 14: any dimension may be a single value or an array (multi-value / IN).
  device?: string | string[]
  country?: string | string[]
  source?: string | string[]
  utmSource?: string | string[]
  auth?: 'known' | 'anon'
  event?: string | string[]
  // Phase 14b Wave 2 — dimensions v2 + negation
  pagePath?: string | string[]
  city?: string | string[]
  browser?: string | string[]
  os?: string | string[]
  sourceKind?: string | string[]
  prop?: { k: string; v: string }
  notCountry?: string
  notDevice?: string
  notPath?: string
  notBrowser?: string
}

const arr = (v: string | string[] | undefined): string[] => (v == null ? [] : Array.isArray(v) ? v : [v])

type Row = {
  combo: string
  filters: string
  rpcVisitors: number
  rawVisitors: number
  visitorsOk: boolean
  mirrorPageViews: number
  rawPageViews: number
  pageViewsOk: boolean
}

function lit(v: string): string {
  return `'${v.replace(/'/g, "''")}'`
}

/** Independent, hand-written SQL predicates — deliberately NOT built from
 *  insights_apply_filters. If the shared predicate drifts, this disagrees. */
function rawWhere(c: Combo): string {
  const parts = [
    `created_at >= ${lit(FROM_ISO)}`,
    `created_at < ${lit(TO_ISO)}`,
  ]
  if (!c.includeBots) parts.push('not bot_likely')
  if (arr(c.device).length) {
    const ds = arr(c.device)
    const known = ds.filter((d) => d !== 'unknown')
    const preds: string[] = []
    if (known.length) preds.push(`device_type in (${known.map(lit).join(', ')})`)
    if (ds.includes('unknown')) preds.push('device_type is null')
    parts.push(preds.length > 1 ? `(${preds.join(' or ')})` : preds[0])
  }
  if (arr(c.country).length) parts.push(`country in (${arr(c.country).map(lit).join(', ')})`)
  if (arr(c.source).length) {
    const ss = arr(c.source).map((s) => `referrer ilike ${lit('%' + s + '%')}`)
    parts.push(ss.length > 1 ? `(${ss.join(' or ')})` : ss[0])
  }
  if (arr(c.utmSource).length) parts.push(`utm_source in (${arr(c.utmSource).map(lit).join(', ')})`)
  if (c.auth === 'known') parts.push('user_id is not null')
  if (c.auth === 'anon') parts.push('user_id is null')
  if (arr(c.event).length) parts.push(`event_name in (${arr(c.event).map(lit).join(', ')})`)
  // Wave 2 dimensions — independent hand-written forms
  if (arr(c.pagePath).length) {
    const ps = arr(c.pagePath).map((p) => `page_path ilike ${lit('%' + p + '%')}`)
    parts.push(ps.length > 1 ? `(${ps.join(' or ')})` : ps[0])
  }
  if (arr(c.city).length) parts.push(`city in (${arr(c.city).map(lit).join(', ')})`)
  if (arr(c.browser).length) parts.push(`browser in (${arr(c.browser).map(lit).join(', ')})`)
  if (arr(c.os).length) parts.push(`os in (${arr(c.os).map(lit).join(', ')})`)
  if (arr(c.sourceKind).length) parts.push(`source_kind in (${arr(c.sourceKind).map(lit).join(', ')})`)
  if (c.prop) parts.push(`properties->>${lit(c.prop.k)} = ${lit(c.prop.v)}`)
  // Negations — SQL three-valued logic (NULL dimension rows are excluded)
  if (c.notCountry) parts.push(`not (country = ${lit(c.notCountry)})`)
  if (c.notDevice) {
    parts.push(c.notDevice === 'unknown' ? 'device_type is not null' : `not (device_type = ${lit(c.notDevice)})`)
  }
  if (c.notPath) parts.push(`not (page_path ilike ${lit('%' + c.notPath + '%')})`)
  if (c.notBrowser) parts.push(`not (browser = ${lit(c.notBrowser)})`)
  return parts.join(' and ')
}

function toAdminFilters(c: Combo): AdminFilters {
  const not: AdminFilters['not'] = {}
  if (c.notCountry) not.country = c.notCountry
  if (c.notDevice) not.device = c.notDevice
  if (c.notPath) not.pagePath = c.notPath
  if (c.notBrowser) not.browser = c.notBrowser
  return {
    range: SEL,
    includeBots: c.includeBots,
    device: c.device,
    country: c.country,
    source: c.source,
    utmSource: c.utmSource,
    auth: c.auth,
    event: c.event,
    pagePath: c.pagePath,
    city: c.city,
    browser: c.browser,
    os: c.os,
    sourceKind: c.sourceKind,
    props: c.prop ? [c.prop] : undefined,
    not: Object.keys(not).length ? not : undefined,
  }
}

function describe(c: Combo): string {
  const parts: string[] = []
  const show = (k: string, v: string | string[] | undefined) => {
    if (arr(v).length) parts.push(`${k}=${arr(v).join('|')}`)
  }
  show('device', c.device)
  show('country', c.country)
  show('source', c.source)
  show('utm_source', c.utmSource)
  if (c.auth) parts.push(`auth=${c.auth}`)
  show('event', c.event)
  show('path', c.pagePath)
  show('city', c.city)
  show('browser', c.browser)
  show('os', c.os)
  show('kind', c.sourceKind)
  if (c.prop) parts.push(`prop ${c.prop.k}=${c.prop.v}`)
  if (c.notCountry) parts.push(`country≠${c.notCountry}`)
  if (c.notDevice) parts.push(`device≠${c.notDevice}`)
  if (c.notPath) parts.push(`path≠${c.notPath}`)
  if (c.notBrowser) parts.push(`browser≠${c.notBrowser}`)
  parts.push(`bots=${c.includeBots ? 'incl' : 'excl'}`)
  return parts.join(' ')
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin env not set (run with --env-file=.env.local)')
  }
  const db = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyDb = db as any

  // The verifier makes ~150 sequential network calls; a single transient
  // "fetch failed" must not abort a 2-minute run. Read-only calls → safe to
  // retry blindly.
  async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: unknown
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn()
      } catch (err) {
        lastErr = err
        if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)))
      }
    }
    throw lastErr
  }

  // _admin_audit_exec wraps the query as `select to_jsonb(t) ... limit 1`,
  // so it returns ONE row as a jsonb object (or null). All verifier queries
  // are single-row aggregates / limit-1 lookups, which fits exactly.
  async function runSql(sql: string): Promise<Record<string, unknown> | null> {
    return withRetry(async () => {
      const { data, error } = await anyDb.rpc('_admin_audit_exec', { p_sql: sql })
      if (error) throw new Error(`_admin_audit_exec failed: ${error.message}\nSQL: ${sql}`)
      return (data ?? null) as Record<string, unknown> | null
    })
  }

  // Discover real fixture values from the pinned window so every combo
  // filters on data that actually exists (a 0=0 assertion proves little).
  const topCountryRow = await runSql(
    `select country from user_events
      where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
        and country is not null and country <> ''
      group by 1 order by count(*) desc limit 1`,
  )
  const topCountry = String(topCountryRow?.country ?? 'IN')

  const utmRow = await runSql(
    `select utm_source from user_events
      where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
        and utm_source is not null and utm_source <> ''
      group by 1 order by count(*) desc limit 1`,
  )
  // Fall back to a synthetic value (still a valid 0=0 equality assertion,
  // labeled as such in the output) if the window carries no UTM traffic.
  const utmSource = utmRow?.utm_source ? String(utmRow.utm_source) : 'zz-verify-synthetic'
  const utmIsSynthetic = !utmRow?.utm_source

  const sourceRow = await runSql(
    `select lower(substring(referrer from '://([^/]+)')) as host from user_events
      where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
        and referrer is not null and referrer <> ''
      group by 1 order by count(*) desc limit 1`,
  )
  const sourceHost = sourceRow?.host ? String(sourceRow.host) : 'google'

  // Wave 2 fixtures — top city / browser / os / page_viewed path in the window
  // (browser/os exist for the pinned week via the 2026-07-02 backfill).
  const cityRow = await runSql(
    `select city from user_events
      where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
        and city is not null and city <> ''
      group by 1 order by count(*) desc limit 1`,
  )
  const topCity = cityRow?.city ? String(cityRow.city) : 'Mumbai'
  const browserRow = await runSql(
    `select browser from user_events
      where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
        and browser is not null
      group by 1 order by count(*) desc limit 1`,
  )
  const topBrowser = browserRow?.browser ? String(browserRow.browser) : 'chrome'
  const osRow = await runSql(
    `select os from user_events
      where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
        and os is not null
      group by 1 order by count(*) desc limit 1`,
  )
  const topOs = osRow?.os ? String(osRow.os) : 'windows'
  const pathRow = await runSql(
    `select properties->>'path' as p from user_events
      where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
        and event_name = 'page_viewed' and properties->>'path' is not null
      group by 1 order by count(*) desc limit 1`,
  )
  const topPath = pathRow?.p ? String(pathRow.p) : '/'

  const combos: Combo[] = [
    { name: 'none', includeBots: false },
    { name: 'none+bots', includeBots: true },
    { name: 'device', includeBots: false, device: 'desktop' },
    { name: 'device=unknown', includeBots: false, device: 'unknown' },
    { name: 'country', includeBots: false, country: topCountry },
    { name: 'auth=anon', includeBots: false, auth: 'anon' },
    { name: 'auth=known', includeBots: false, auth: 'known' },
    { name: 'utm_source', includeBots: false, utmSource },
    { name: 'source', includeBots: false, source: sourceHost },
    { name: 'event', includeBots: false, event: 'page_viewed' },
    { name: 'device+country', includeBots: false, device: 'desktop', country: topCountry },
    { name: 'device+auth', includeBots: false, device: 'desktop', auth: 'known' },
    { name: 'country+event', includeBots: false, country: topCountry, event: 'page_viewed' },
    { name: '3stack', includeBots: false, device: 'desktop', country: topCountry, auth: 'anon' },
    { name: '3stack+bots', includeBots: true, device: 'desktop', country: topCountry, auth: 'anon' },
    // Phase 14 — multi-value (array / IN) combos. Equivalence holds even when a
    // value has 0 rows (RPC array path must equal the hand-written IN clause).
    { name: 'country[multi]', includeBots: false, country: [topCountry, 'US'] },
    { name: 'device[real+unknown]', includeBots: false, device: ['desktop', 'unknown'] },
    { name: 'device[mobile,tablet]', includeBots: false, device: ['mobile', 'tablet'] },
    { name: 'event[multi]', includeBots: false, event: ['page_viewed', 'tool_page_viewed'] },
    { name: 'multi+stack', includeBots: false, device: ['desktop', 'mobile'], country: [topCountry, 'US'] },
    // Phase 14b Wave 2 — dimensions v2. Same discipline: shared predicate +
    // TS mirror vs independent hand-written SQL.
    { name: 'page', includeBots: false, pagePath: '/tools' },
    { name: 'page[multi]', includeBots: false, pagePath: ['/tools', '/compare'] },
    { name: 'city', includeBots: false, city: topCity },
    { name: 'browser', includeBots: false, browser: topBrowser },
    { name: 'browser[multi]', includeBots: false, browser: [topBrowser, 'safari'] },
    { name: 'os', includeBots: false, os: topOs },
    { name: 'source_kind=server', includeBots: false, sourceKind: 'server' },
    { name: 'prop path', includeBots: false, prop: { k: 'path', v: topPath } },
    { name: 'not country', includeBots: false, notCountry: topCountry },
    { name: 'not device', includeBots: false, notDevice: 'desktop' },
    { name: 'not device=unknown', includeBots: false, notDevice: 'unknown' },
    { name: 'not path', includeBots: false, notPath: '/tools' },
    { name: 'not browser', includeBots: false, notBrowser: topBrowser },
    { name: 'pos+neg stack', includeBots: false, country: [topCountry, 'US'], notBrowser: topBrowser },
    { name: 'kitchen sink', includeBots: false, device: 'desktop', browser: topBrowser, pagePath: '/tools', notCountry: 'CN' },
  ]

  const rows: Row[] = []
  for (const c of combos) {
    const f = toAdminFilters(c)
    const where = rawWhere(c)

    // A. RPC path — shared SQL predicate via p_filters.
    const rpcRes = await withRetry(async () => {
      const res = await anyDb
        .rpc('distinct_visitors_in_window', {
          p_cutoff: FROM_ISO,
          p_end: TO_ISO,
          p_include_bots: c.includeBots,
          p_filters: filtersToJsonb(f),
        })
        .maybeSingle()
      if (res.error) throw new Error(`RPC failed [${c.name}]: ${res.error.message}`)
      return res
    })
    const rpcVisitors = Number((rpcRes.data as { count?: number } | null)?.count ?? 0)

    // A'. Independent raw SQL for the same number.
    const rawV = await runSql(
      `select count(distinct distinct_id)::bigint as n from user_events where ${where}`,
    )
    const rawVisitors = Number(rawV?.n ?? 0)

    // B. Direct-select path — page_viewed count through the applyFilters
    //    TS mirror, exactly as getOverviewMetrics builds it.
    let q = db
      .from('user_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'page_viewed')
      .gte('created_at', FROM_ISO)
      .lt('created_at', TO_ISO)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!c.includeBots) q = (q as any).eq('bot_likely', false)
    q = applyFilters(q, f) // no dropEvent: an event filter must agree with the raw SQL
    const mirrorRes = await withRetry(async () => {
      const res = await q
      if (res.error) throw new Error(`mirror select failed [${c.name}]: ${res.error.message}`)
      return res
    })
    const mirrorPageViews = mirrorRes.count ?? 0

    // B'. Independent raw SQL for the page_viewed count. NOTE the pin AND
    //     the combo's own event filter both apply (AND semantics).
    const rawP = await runSql(
      `select count(*)::bigint as n from user_events where event_name = 'page_viewed' and ${where}`,
    )
    const rawPageViews = Number(rawP?.n ?? 0)

    rows.push({
      combo: c.name,
      filters: describe(c),
      rpcVisitors,
      rawVisitors,
      visitorsOk: rpcVisitors === rawVisitors,
      mirrorPageViews,
      rawPageViews,
      pageViewsOk: mirrorPageViews === rawPageViews,
    })
  }

  // ── Phase 10.5a extension: insights_user_directory + geo breakdown ─────
  // Same discipline as the main matrix: the LIVE path (RPC with p_filters →
  // the shared SQL predicate) vs independent hand-written WHERE clauses.

  type ExtraRow = { name: string; live: string; raw: string; ok: boolean }
  const extra: ExtraRow[] = []
  const addExtra = (name: string, live: unknown, raw: unknown) => {
    const l = JSON.stringify(live)
    const r = JSON.stringify(raw)
    extra.push({ name, live: l, raw: r, ok: l === r })
  }

  // U1. Users directory — no optional filters, humans, sort=events:
  //     exact total + the full top row vs hand SQL.
  {
    const res = await anyDb.rpc('insights_user_directory', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false,
      p_filters: null, p_sort: 'events', p_limit: 1, p_offset: 0,
    })
    if (res.error) throw new Error(`insights_user_directory failed [U1]: ${res.error.message}`)
    const top = (res.data as Array<Record<string, unknown>>)[0] ?? {}
    const live = {
      total: Number(top.total_rows ?? 0),
      id: top.distinct_id,
      events: Number(top.events_in_window ?? 0),
      days: Number(top.active_days ?? 0),
      returning: !!top.is_returning,
    }
    const raw = await runSql(
      `with iw as (
         select distinct_id,
                count(*)::bigint as ev,
                count(distinct date_trunc('day', created_at at time zone 'Asia/Kolkata'))::int as days,
                max(created_at) as w_last
         from user_events
         where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)} and not bot_likely
         group by 1
       ),
       lt as (
         select ue.distinct_id, min(ue.created_at) as first_ever
         from user_events ue join iw on iw.distinct_id = ue.distinct_id
         where not ue.bot_likely and ue.created_at < ${lit(TO_ISO)}
         group by 1
       )
       select (select count(*) from iw) as total,
              iw.distinct_id as id, iw.ev as events, iw.days,
              (lt.first_ever < ${lit(FROM_ISO)}) as returning
       from iw join lt on lt.distinct_id = iw.distinct_id
       order by iw.ev desc, iw.w_last desc, iw.distinct_id asc
       limit 1`,
    )
    addExtra('user_directory none (total+top row, sort=events)', live, {
      total: Number(raw?.total ?? -1),
      id: raw?.id,
      events: Number(raw?.events ?? -1),
      days: Number(raw?.days ?? -1),
      returning: !!raw?.returning,
    })
  }

  // U2. Users directory — device+country stack, humans: total must equal
  //     BOTH the hand SQL count AND distinct_visitors_in_window with the
  //     same filters (the cross-tile invariant the Users page relies on).
  {
    const f = toAdminFilters({ name: 'u2', includeBots: false, device: 'desktop', country: topCountry })
    const res = await anyDb.rpc('insights_user_directory', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false,
      p_filters: filtersToJsonb(f), p_sort: 'last_seen', p_limit: 1, p_offset: 0,
    })
    if (res.error) throw new Error(`insights_user_directory failed [U2]: ${res.error.message}`)
    const total = Number((res.data as Array<{ total_rows?: number }>)[0]?.total_rows ?? 0)
    const raw = await runSql(
      `select count(distinct distinct_id)::bigint as n from user_events
        where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
          and not bot_likely and device_type = 'desktop' and country = ${lit(topCountry)}`,
    )
    const tile = await anyDb
      .rpc('distinct_visitors_in_window', {
        p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false, p_filters: filtersToJsonb(f),
      })
      .maybeSingle()
    if (tile.error) throw new Error(`distinct_visitors_in_window failed [U2]: ${tile.error.message}`)
    addExtra(
      `user_directory device=desktop+country=${topCountry} (total = raw = visitors tile)`,
      { total, tile: Number((tile.data as { count?: number } | null)?.count ?? -1) },
      { total: Number(raw?.n ?? -1), tile: Number(raw?.n ?? -1) },
    )
  }

  // G1. Geo breakdown — device=desktop through p_filters (migration 156):
  //     country count + the top country's visitors/events vs hand SQL.
  {
    const res = await anyDb.rpc('insights_geo_breakdown', {
      p_days: 7, p_include_bots: false, p_cutoff: FROM_ISO, p_end: TO_ISO,
      p_filters: { device: 'desktop' },
    })
    if (res.error) throw new Error(`insights_geo_breakdown failed [G1]: ${res.error.message}`)
    const rows = (res.data as Array<{ country: string; visitors: number; events: number }>) ?? []
    const top = rows[0]
    const live = {
      countries: rows.length,
      topCountry: top?.country ?? null,
      topVisitors: Number(top?.visitors ?? -1),
      topEvents: Number(top?.events ?? -1),
    }
    const raw = await runSql(
      `with base as (
         select distinct_id, country from user_events
         where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
           and not bot_likely and device_type = 'desktop'
           and country is not null and country <> ''
       ),
       per_country as (
         select country, count(distinct distinct_id)::int as visitors, count(*)::int as events
         from base group by 1
       )
       select (select count(*) from per_country) as countries,
              country as top_country, visitors as top_visitors, events as top_events
       from per_country order by visitors desc, country asc limit 1`,
    )
    addExtra('geo_breakdown device=desktop (countries + top country row)', live, {
      countries: Number(raw?.countries ?? -1),
      topCountry: raw?.top_country ?? null,
      topVisitors: Number(raw?.top_visitors ?? -1),
      topEvents: Number(raw?.top_events ?? -1),
    })
  }

  // ── Phase 10.5b extension: event property breakdown + sentiment window ──
  // Same discipline: the LIVE path (RPC p_filters → shared predicate, or the
  // applyFilters PostgREST mirror) vs independent hand-written WHERE clauses.

  /** Normalize a jsonb_agg row list to the same {v,e,u} field order as the
   *  live mapping (jsonb_build_object returns keys alphabetically). */
  const normRows = (rows: unknown): Array<{ v: unknown; e: number; u: number }> =>
    ((rows as Array<{ v: unknown; e: number | string; u: number | string }>) ?? []).map((r) => ({
      v: r.v,
      e: Number(r.e),
      u: Number(r.u),
    }))

  // E1. insights_event_property_breakdown — page_viewed × path, device=desktop,
  //     humans: full top-5 rows (value/events/visitors) vs hand SQL.
  {
    const res = await anyDb.rpc('insights_event_property_breakdown', {
      p_event: 'page_viewed', p_prop: 'path',
      p_filters: { device: 'desktop' },
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_limit: 5, p_include_bots: false,
    })
    if (res.error) throw new Error(`insights_event_property_breakdown failed [E1]: ${res.error.message}`)
    const live = (res.data as Array<{ value: string; events: number | string; visitors: number | string }>).map(
      (r) => ({ v: r.value, e: Number(r.events), u: Number(r.visitors) }),
    )
    const raw = await runSql(
      `with rows as (
         select coalesce(nullif(properties->>'path',''), '(missing)') as v,
                count(*)::int as e, count(distinct distinct_id)::int as u
         from user_events
         where event_name = 'page_viewed'
           and created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
           and not bot_likely and device_type = 'desktop'
         group by 1 order by 2 desc, 1 asc limit 5
       )
       select jsonb_agg(jsonb_build_object('v', v, 'e', e, 'u', u)) as rows from rows`,
    )
    addExtra('event_property_breakdown page_viewed×path device=desktop (top-5 rows)', live, normRows(raw?.rows))
  }

  // E2. insights_event_property_breakdown — tool_page_viewed × tool_slug,
  //     country + auth=anon stack, humans: top-3 rows vs hand SQL.
  {
    const res = await anyDb.rpc('insights_event_property_breakdown', {
      p_event: 'tool_page_viewed', p_prop: 'tool_slug',
      p_filters: { country: topCountry, auth: 'anon' },
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_limit: 3, p_include_bots: false,
    })
    if (res.error) throw new Error(`insights_event_property_breakdown failed [E2]: ${res.error.message}`)
    const live = (res.data as Array<{ value: string; events: number | string; visitors: number | string }>).map(
      (r) => ({ v: r.value, e: Number(r.events), u: Number(r.visitors) }),
    )
    const raw = await runSql(
      `with rows as (
         select coalesce(nullif(properties->>'tool_slug',''), '(missing)') as v,
                count(*)::int as e, count(distinct distinct_id)::int as u
         from user_events
         where event_name = 'tool_page_viewed'
           and created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
           and not bot_likely and country = ${lit(topCountry)} and user_id is null
         group by 1 order by 2 desc, 1 asc limit 3
       )
       select jsonb_agg(jsonb_build_object('v', v, 'e', e, 'u', u)) as rows from rows`,
    )
    addExtra(`event_property_breakdown tool_page_viewed×tool_slug country=${topCountry}+auth=anon (top-3)`, live, normRows(raw?.rows))
  }

  // S1. Sentiment funnel leg (Phase 5b F13 fix) — the LIVE path is a direct
  //     PostgREST count through the applyFilters mirror exactly as
  //     lib/admin/sentiment.ts getSentimentFunnel builds it; vs hand SQL.
  {
    const f = toAdminFilters({ name: 's1', includeBots: false })
    let q = db
      .from('user_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'sentiment_card_viewed')
      .gte('created_at', FROM_ISO)
      .lt('created_at', TO_ISO)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    q = (q as any).eq('bot_likely', false)
    q = applyFilters(q, f, { dropEvent: true })
    const mirror = await q
    if (mirror.error) throw new Error(`sentiment mirror select failed [S1]: ${mirror.error.message}`)
    const raw = await runSql(
      `select count(*)::bigint as n from user_events
        where event_name = 'sentiment_card_viewed' and not bot_likely
          and created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}`,
    )
    addExtra('sentiment_card_viewed windowed humans (F13 leg = raw SQL)', mirror.count ?? -1, Number(raw?.n ?? -2))
  }

  // ── Phase 14b Wave 1 extension: filter HONESTY on the formerly-unfiltered
  // RPCs (migration 183). Same discipline: LIVE path (RPC with p_filters →
  // shared predicate) vs independent hand-written WHERE clauses.

  // H1. insights_search_log — country filter: row count vs hand SQL over the
  //     same qualifying-search definition.
  {
    const res = await anyDb.rpc('insights_search_log', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false,
      p_limit: 100000, p_filters: { country: topCountry },
    })
    if (res.error) throw new Error(`insights_search_log failed [H1]: ${res.error.message}`)
    const raw = await runSql(
      `select count(*)::bigint as n from user_events ue
        where ue.created_at >= ${lit(FROM_ISO)} and ue.created_at < ${lit(TO_ISO)}
          and not ue.bot_likely and ue.country = ${lit(topCountry)}
          and (ue.event_name in ('search_query_submitted','empty_search')
               or (ue.event_name = 'search_query_typed' and ue.properties->>'final_blur' = 'true'))
          and coalesce(nullif(ue.properties->>'query',''), nullif(ue.properties->>'current_text','')) is not null`,
    )
    addExtra(`search_log country=${topCountry} (row count = raw)`, (res.data as unknown[]).length, Number(raw?.n ?? -1))
  }

  // H2. insights_plan_dropoff — country filter: one row per plan_started
  //     visitor whose (filtered) journey events matched.
  {
    const res = await anyDb.rpc('insights_plan_dropoff', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false,
      p_filters: { country: topCountry },
    })
    if (res.error) throw new Error(`insights_plan_dropoff failed [H2]: ${res.error.message}`)
    const raw = await runSql(
      `select count(distinct distinct_id)::bigint as n from user_events
        where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
          and not bot_likely and country = ${lit(topCountry)}
          and event_name = 'plan_started'`,
    )
    addExtra(`plan_dropoff country=${topCountry} (rows = raw plan_started visitors)`, (res.data as unknown[]).length, Number(raw?.n ?? -1))
  }

  // H3. insights_error_overview — country filter: sum(occurrences) vs raw
  //     error_encountered count.
  {
    const res = await anyDb.rpc('insights_error_overview', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false,
      p_filters: { country: topCountry },
    })
    if (res.error) throw new Error(`insights_error_overview failed [H3]: ${res.error.message}`)
    const total = ((res.data as Array<{ occurrences: number | string }>) ?? []).reduce((a, r) => a + Number(r.occurrences), 0)
    const raw = await runSql(
      `select count(*)::bigint as n from user_events
        where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
          and not bot_likely and country = ${lit(topCountry)}
          and event_name = 'error_encountered'`,
    )
    addExtra(`error_overview country=${topCountry} (sum occurrences = raw)`, total, Number(raw?.n ?? -1))
  }

  // H4. insights_user_sessions_v2 — pinned window + event constraint on the
  //     busiest visitor of the week: total events across sessions = raw count;
  //     with p_events, every returned session contains that event.
  {
    const busy = await runSql(
      `select distinct_id from user_events
        where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)} and not bot_likely
        group by 1 order by count(*) desc limit 1`,
    )
    const busyId = String(busy?.distinct_id ?? '')
    const res = await anyDb.rpc('insights_user_sessions_v2', {
      p_distinct_id: busyId, p_limit: 10000, p_events_cap: 1,
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_events: null,
    })
    if (res.error) throw new Error(`insights_user_sessions_v2 failed [H4]: ${res.error.message}`)
    const totalEvents = ((res.data as Array<{ event_count: number | string }>) ?? []).reduce((a, s) => a + Number(s.event_count), 0)
    const raw = await runSql(
      `select count(*)::bigint as n from user_events
        where distinct_id = ${lit(busyId)}
          and created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}`,
    )
    addExtra('user_sessions_v2 pinned window (sum event_count = raw)', totalEvents, Number(raw?.n ?? -1))

    const resEv = await anyDb.rpc('insights_user_sessions_v2', {
      p_distinct_id: busyId, p_limit: 10000, p_events_cap: 10000,
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_events: ['page_viewed'],
    })
    if (resEv.error) throw new Error(`insights_user_sessions_v2 failed [H4b]: ${resEv.error.message}`)
    const sessions = (resEv.data as Array<{ events: Array<{ event_name: string }> }>) ?? []
    const allContain = sessions.every((s) => (s.events ?? []).some((e) => e.event_name === 'page_viewed'))
    addExtra('user_sessions_v2 p_events=[page_viewed] (every session contains it)', allContain, true)
  }

  // H5. insights_user_directory p_search — searching a real visitor id
  //     substring finds exactly the raw match count.
  {
    const busy = await runSql(
      `select distinct_id from user_events
        where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)} and not bot_likely
        group by 1 order by count(*) desc limit 1`,
    )
    const needle = String(busy?.distinct_id ?? '').slice(0, 12)
    const res = await anyDb.rpc('insights_user_directory', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false,
      p_filters: null, p_sort: 'events', p_limit: 1, p_offset: 0, p_search: needle,
    })
    if (res.error) throw new Error(`insights_user_directory failed [H5]: ${res.error.message}`)
    const total = Number((res.data as Array<{ total_rows?: number }>)[0]?.total_rows ?? 0)
    const raw = await runSql(
      `select count(distinct distinct_id)::bigint as n from user_events
        where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
          and not bot_likely and distinct_id ilike ${lit('%' + needle + '%')}`,
    )
    addExtra(`user_directory p_search=${needle} (total = raw matches)`, total, Number(raw?.n ?? -1))
  }

  // H6. Live RPCs (now()-anchored, not pinned-week reproducible) — structural:
  //     with a country filter every returned row honors it, and the calls
  //     accept p_filters at all (signature guard).
  {
    const feed = await anyDb.rpc('insights_activity_feed', {
      p_limit: 100, p_include_bots: true, p_filters: { country: topCountry },
    })
    if (feed.error) throw new Error(`insights_activity_feed failed [H6]: ${feed.error.message}`)
    const feedOk = ((feed.data as Array<{ country: string | null }>) ?? []).every((r) => r.country === topCountry)
    const live = await anyDb.rpc('insights_live_sessions', {
      p_active_within_sec: 3600, p_include_bots: true, p_filters: { country: topCountry },
    })
    if (live.error) throw new Error(`insights_live_sessions failed [H6]: ${live.error.message}`)
    const liveOk = ((live.data as Array<{ country: string | null }>) ?? []).every((r) => r.country === topCountry)
    addExtra(`activity_feed+live_sessions country=${topCountry} (every row honors filter)`, { feedOk, liveOk }, { feedOk: true, liveOk: true })
  }

  // ── Phase 14b Wave 3 — funnel drill-down consistency (migration 186) ───
  // The breakdown and people RPCs must reconcile EXACTLY with the funnel
  // strip (insights_funnel_users) on the same steps + filters.
  {
    const FUNNEL_STEPS = ['page_viewed', 'tool_page_viewed', 'tool_visit_clicked']
    const funnelArgs = {
      p_steps: FUNNEL_STEPS, p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false,
    }
    for (const [suffix, extraFilters] of [
      ['none', null],
      [`country=${topCountry}`, { country: topCountry }],
    ] as const) {
      const strip = await anyDb.rpc('insights_funnel_users', { ...funnelArgs, p_filters: extraFilters })
      if (strip.error) throw new Error(`insights_funnel_users failed [W3 ${suffix}]: ${strip.error.message}`)
      const stripByIdx = new Map(
        ((strip.data ?? []) as Array<{ step_index: number; users: number | string }>).map((r) => [Number(r.step_index), Number(r.users)]),
      )
      const bd = await anyDb.rpc('insights_funnel_breakdown', {
        ...funnelArgs, p_filters: extraFilters, p_dimension: 'country', p_limit: 10000,
      })
      if (bd.error) throw new Error(`insights_funnel_breakdown failed [W3 ${suffix}]: ${bd.error.message}`)
      const bdRows = (bd.data ?? []) as Array<{ step_index: number; users: number | string }>
      const bdStep1 = bdRows.filter((r) => Number(r.step_index) === 1).reduce((a, r) => a + Number(r.users), 0)
      // Breakdown keys attribute a person to their first step-1 event; every
      // step-1 person has one, so the step-1 column must sum to the strip.
      addExtra(`funnel_breakdown step-1 sum = strip step-1 [${suffix}]`, bdStep1, stripByIdx.get(1) ?? -1)

      const conv = await anyDb.rpc('insights_funnel_people', {
        ...funnelArgs, p_filters: extraFilters, p_step: 2, p_converted: true, p_limit: 100000,
      })
      if (conv.error) throw new Error(`insights_funnel_people failed [W3 ${suffix}]: ${conv.error.message}`)
      const drop = await anyDb.rpc('insights_funnel_people', {
        ...funnelArgs, p_filters: extraFilters, p_step: 2, p_converted: false, p_limit: 100000,
      })
      if (drop.error) throw new Error(`insights_funnel_people failed [W3b ${suffix}]: ${drop.error.message}`)
      // people(step2, converted) = strip step-2; converted+dropped = strip step-1.
      addExtra(
        `funnel_people conv@2 = strip step-2; conv+drop = step-1 [${suffix}]`,
        { conv: (conv.data as unknown[]).length, total: (conv.data as unknown[]).length + (drop.data as unknown[]).length },
        { conv: stripByIdx.get(2) ?? -1, total: stripByIdx.get(1) ?? -1 },
      )
    }
  }

  // ── Phase 14b Wave 4 — retention + paths structural invariants (mig 187) ─
  {
    type RetRow = { cohort_start: string; cohort_size: number | string; period_index: number | string; retained: number | string }
    const ret = await anyDb.rpc('insights_retention', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false, p_filters: null,
      p_first_event: null, p_return_event: null, p_period: 'day',
    })
    if (ret.error) throw new Error(`insights_retention failed [W4]: ${ret.error.message}`)
    const retRows = ((ret.data ?? []) as RetRow[]).map((r) => ({
      c: r.cohort_start, size: Number(r.cohort_size), p: Number(r.period_index), n: Number(r.retained),
    }))
    const p0Full = retRows.filter((r) => r.p === 0).every((r) => r.n === r.size)
    const monotone = retRows.every((r) => r.n <= r.size)
    addExtra('retention: D0 = cohort size AND retained ≤ size (pinned week, daily)', { p0Full, monotone, rows: retRows.length > 0 }, { p0Full: true, monotone: true, rows: true })

    // Filters strictly shrink or hold every cohort size.
    const retIN = await anyDb.rpc('insights_retention', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false, p_filters: { country: topCountry },
      p_first_event: null, p_return_event: null, p_period: 'day',
    })
    if (retIN.error) throw new Error(`insights_retention failed [W4b]: ${retIN.error.message}`)
    const sizesAll = new Map(retRows.map((r) => [r.c, r.size]))
    const shrunk = ((retIN.data ?? []) as RetRow[]).every((r) => Number(r.cohort_size) <= (sizesAll.get(r.cohort_start) ?? 0))
    addExtra(`retention: country=${topCountry} cohorts ⊆ unfiltered`, shrunk, true)

    type PathRow = { depth: number | string; transitions: number | string }
    const paths = await anyDb.rpc('insights_event_paths', {
      p_cutoff: FROM_ISO, p_end: TO_ISO, p_include_bots: false, p_filters: null,
      p_anchor: 'page_viewed', p_direction: 'after', p_depth: 3, p_limit: 10000,
    })
    if (paths.error) throw new Error(`insights_event_paths failed [W4]: ${paths.error.message}`)
    const d1 = ((paths.data ?? []) as PathRow[]).filter((r) => Number(r.depth) === 1)
      .reduce((a, r) => a + Number(r.transitions), 0)
    const anchorCount = await runSql(
      `select count(*)::bigint as n from user_events
        where created_at >= ${lit(FROM_ISO)} and created_at < ${lit(TO_ISO)}
          and not bot_likely and event_name = 'page_viewed'`,
    )
    // Each session contributes at most ONE first-transition after its first
    // anchor, so depth-1 transitions can never exceed raw anchor events.
    addExtra('paths: depth-1 transitions ≤ raw anchor events', d1 <= Number(anchorCount?.n ?? 0), true)
  }

  // ── Render the matrix ──────────────────────────────────────────────────
  const header = ['combo', 'filters', 'visitors rpc', 'visitors raw', '=', 'page_views mirror', 'page_views raw', '=']
  const table = rows.map((r) => [
    r.combo,
    r.filters,
    String(r.rpcVisitors),
    String(r.rawVisitors),
    r.visitorsOk ? 'OK' : 'MISMATCH',
    String(r.mirrorPageViews),
    String(r.rawPageViews),
    r.pageViewsOk ? 'OK' : 'MISMATCH',
  ])
  const widths = header.map((h, i) => Math.max(h.length, ...table.map((row) => row[i].length)))
  const fmtRow = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ')

  console.log(`Filter-matrix verifier — pinned window ${FROM_ISO} .. ${TO_ISO}`)
  console.log(`fixtures: country=${topCountry}, utm_source=${utmSource}${utmIsSynthetic ? ' (synthetic — no UTM rows in window)' : ''}, source=${sourceHost}\n`)
  console.log(fmtRow(header))
  console.log(widths.map((w) => '-'.repeat(w)).join('  '))
  for (const row of table) console.log(fmtRow(row))

  console.log('\nPhase 10.5a + 10.5b extensions — users directory, geo, event breakdown, sentiment window:')
  for (const e of extra) {
    console.log(`  ${e.ok ? 'OK      ' : 'MISMATCH'} ${e.name}`)
    if (!e.ok) console.log(`           live=${e.live}\n           raw =${e.raw}`)
  }

  const failures = rows.filter((r) => !r.visitorsOk || !r.pageViewsOk)
  const extraFailures = extra.filter((e) => !e.ok)
  console.log(
    `\n${rows.length} combos × 2 assertions + ${extra.length} extended checks = ${rows.length * 2 + extra.length} checks; ${
      failures.length === 0 && extraFailures.length === 0
        ? 'ALL GREEN'
        : `${failures.length + extraFailures.length} FAILED`
    }`,
  )

  if (process.argv.includes('--write-doc')) {
    const md = [
      '# Filter-matrix verification — Phase 10.4 (verification mean #6)',
      '',
      `Generated by \`npm run tracking:filters -- --write-doc\` on ${new Date().toISOString()}.`,
      '',
      'Every filter combination is computed through the LIVE paths (the shared',
      'SQL predicate `insights_apply_filters` via `distinct_visitors_in_window.p_filters`,',
      'and the `applyFilters()` PostgREST mirror on a direct `page_viewed` select)',
      'and through independent hand-written raw SQL over the pinned, immutable',
      `audit week (${FROM_ISO} .. ${TO_ISO}). Exact equality required; the script`,
      'exits 1 on any mismatch.',
      '',
      `Fixture values discovered from the window: country=\`${topCountry}\`,`,
      `utm_source=\`${utmSource}\`${utmIsSynthetic ? ' (synthetic — no UTM rows in window)' : ''}, source=\`${sourceHost}\`.`,
      '',
      `| combo | filters | visitors (rpc) | visitors (raw) | ✓ | page_views (mirror) | page_views (raw) | ✓ |`,
      `| --- | --- | ---: | ---: | --- | ---: | ---: | --- |`,
      ...rows.map((r) =>
        `| ${r.combo} | ${r.filters} | ${r.rpcVisitors} | ${r.rawVisitors} | ${r.visitorsOk ? 'OK' : 'MISMATCH'} | ${r.mirrorPageViews} | ${r.rawPageViews} | ${r.pageViewsOk ? 'OK' : 'MISMATCH'} |`,
      ),
      '',
      `Result: ${rows.length} combos × 2 assertions — ${failures.length === 0 ? 'ALL GREEN' : `${failures.length} FAILED`}.`,
      '',
      '## Phase 10.5a + 10.5b extensions',
      '',
      '5a: two combos through `insights_user_directory` (migration 155) and one',
      'filtered path through `insights_geo_breakdown` (migration 156).',
      '5b: two combos through `insights_event_property_breakdown` (migration 157)',
      'and one windowed sentiment funnel leg (the F13 fix) through the',
      'applyFilters PostgREST mirror. Each asserted against independent',
      'hand-written raw SQL:',
      '',
      '| check | live | raw | ✓ |',
      '| --- | --- | --- | --- |',
      ...extra.map((e) => `| ${e.name} | \`${e.live}\` | \`${e.raw}\` | ${e.ok ? 'OK' : 'MISMATCH'} |`),
      '',
      'Notes:',
      '- `page_views` columns assert the combo predicates ANDed with the',
      '  `event_name = page_viewed` pin (so the `event` combo is the pin twice,',
      '  and a hypothetical different event filter would correctly zero it —',
      '  the production queries drop the global event filter on pinned tiles',
      '  via `filtersToJsonb(f, { dropEvent: true })`).',
      '- `device=unknown` means `device_type IS NULL` on both sides (server-emitted events).',
      '- UTM filters target the top-level `utm_source/utm_medium/utm_campaign`',
      '  columns — `properties->>utm_*` has zero rows in the live DB.',
      '',
    ].join('\n')
    const file = join(process.cwd(), 'docs', 'admin', 'filter-matrix.md')
    writeFileSync(file, md)
    console.log(`wrote ${file}`)
  }

  if (failures.length > 0 || extraFailures.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
