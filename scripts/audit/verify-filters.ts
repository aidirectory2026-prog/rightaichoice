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
  device?: string
  country?: string
  source?: string
  utmSource?: string
  auth?: 'known' | 'anon'
  event?: string
}

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
  if (c.device) {
    parts.push(c.device === 'unknown' ? 'device_type is null' : `device_type = ${lit(c.device)}`)
  }
  if (c.country) parts.push(`country = ${lit(c.country)}`)
  if (c.source) parts.push(`referrer ilike ${lit('%' + c.source + '%')}`)
  if (c.utmSource) parts.push(`utm_source = ${lit(c.utmSource)}`)
  if (c.auth === 'known') parts.push('user_id is not null')
  if (c.auth === 'anon') parts.push('user_id is null')
  if (c.event) parts.push(`event_name = ${lit(c.event)}`)
  return parts.join(' and ')
}

function toAdminFilters(c: Combo): AdminFilters {
  return {
    range: SEL,
    includeBots: c.includeBots,
    device: c.device,
    country: c.country,
    source: c.source,
    utmSource: c.utmSource,
    auth: c.auth,
    event: c.event,
  }
}

function describe(c: Combo): string {
  const parts: string[] = []
  if (c.device) parts.push(`device=${c.device}`)
  if (c.country) parts.push(`country=${c.country}`)
  if (c.source) parts.push(`source=${c.source}`)
  if (c.utmSource) parts.push(`utm_source=${c.utmSource}`)
  if (c.auth) parts.push(`auth=${c.auth}`)
  if (c.event) parts.push(`event=${c.event}`)
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

  // _admin_audit_exec wraps the query as `select to_jsonb(t) ... limit 1`,
  // so it returns ONE row as a jsonb object (or null). All verifier queries
  // are single-row aggregates / limit-1 lookups, which fits exactly.
  async function runSql(sql: string): Promise<Record<string, unknown> | null> {
    const { data, error } = await anyDb.rpc('_admin_audit_exec', { p_sql: sql })
    if (error) throw new Error(`_admin_audit_exec failed: ${error.message}\nSQL: ${sql}`)
    return (data ?? null) as Record<string, unknown> | null
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
  ]

  const rows: Row[] = []
  for (const c of combos) {
    const f = toAdminFilters(c)
    const where = rawWhere(c)

    // A. RPC path — shared SQL predicate via p_filters.
    const rpcRes = await anyDb
      .rpc('distinct_visitors_in_window', {
        p_cutoff: FROM_ISO,
        p_end: TO_ISO,
        p_include_bots: c.includeBots,
        p_filters: filtersToJsonb(f),
      })
      .maybeSingle()
    if (rpcRes.error) throw new Error(`RPC failed [${c.name}]: ${rpcRes.error.message}`)
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
    const mirrorRes = await q
    if (mirrorRes.error) throw new Error(`mirror select failed [${c.name}]: ${mirrorRes.error.message}`)
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

  console.log('\nPhase 10.5a extension — users directory + geo breakdown:')
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
      '## Phase 10.5a extension — users directory + geo breakdown',
      '',
      'Two combos through `insights_user_directory` (migration 155) and one',
      'filtered path through `insights_geo_breakdown` (migration 156), each',
      'asserted against independent hand-written raw SQL:',
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
