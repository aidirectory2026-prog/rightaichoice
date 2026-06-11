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

  const failures = rows.filter((r) => !r.visitorsOk || !r.pageViewsOk)
  console.log(
    `\n${rows.length} combos × 2 assertions = ${rows.length * 2} checks; ${failures.length === 0 ? 'ALL GREEN' : `${failures.length} combo(s) FAILED`}`,
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

  if (failures.length > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
