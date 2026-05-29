/**
 * Day 1 (2026-05-20) — Diff two GSC snapshots, classify every page+query
 * pair, write a `gsc_diffs` row consumed by the triage matrix.
 *
 * USAGE:
 *   npm run diff:gsc                                # latest two snapshots (28d)
 *   npm run diff:gsc -- --scope=7d
 *   npm run diff:gsc -- --from=2026-05-11 --to=2026-05-18 --scope=28d
 *   npm run diff:gsc -- --dry-run
 *
 * Signal definitions (per Doc 13):
 *   winning  : position improved ≥2 ranks AND impressions ≥ prior
 *   losing   : position dropped ≥3 ranks OR impr -25%+ OR ctr -0.5pp+
 *   new      : pair appeared this week (not in prior snapshot)
 *   lost     : pair was in prior snapshot, not in this one
 *   flat     : everything else
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'

type Scope = '7d' | '28d'

type PageQueryRow = {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

type SnapshotRow = {
  id: string
  snapshot_date: string
  scope: Scope
  totals: Record<string, number>
  rows: PageQueryRow[]
}

type Signal = 'winning' | 'losing' | 'flat' | 'new' | 'lost'

type DiffSignal = {
  page: string
  query: string
  current: { position: number; clicks: number; impressions: number; ctr: number } | null
  prior: { position: number; clicks: number; impressions: number; ctr: number } | null
  delta_position: number | null
  delta_impressions: number | null
  delta_clicks: number | null
  delta_ctr: number | null
  signal: Signal
}

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const scopeArg = args.find((a) => a.startsWith('--scope='))
const fromArg = args.find((a) => a.startsWith('--from='))
const toArg = args.find((a) => a.startsWith('--to='))
const scope: Scope = (scopeArg ? scopeArg.split('=')[1] : '28d') as Scope

// ── Snapshot fetch ──────────────────────────────────────────────────────────

async function fetchSnapshot(date: string, scope: Scope): Promise<SnapshotRow | null> {
  const supa = getAdminClient()
  const { data, error } = await supa
    .from('gsc_snapshots')
    .select('id, snapshot_date, scope, totals, rows')
    .eq('snapshot_date', date)
    .eq('scope', scope)
    .maybeSingle()
  if (error) throw new Error(`fetch snapshot ${date}/${scope}: ${error.message}`)
  return (data as unknown as SnapshotRow) ?? null
}

async function fetchLatestTwo(scope: Scope): Promise<[SnapshotRow, SnapshotRow]> {
  const supa = getAdminClient()
  const { data, error } = await supa
    .from('gsc_snapshots')
    .select('id, snapshot_date, scope, totals, rows')
    .eq('scope', scope)
    .order('snapshot_date', { ascending: false })
    .limit(2)
  if (error) throw new Error(`fetch latest snapshots: ${error.message}`)
  const rows = (data as unknown as SnapshotRow[]) ?? []
  if (rows.length < 2) throw new Error(`need ≥2 snapshots for scope=${scope}, found ${rows.length}`)
  return [rows[0], rows[1]] // [current, prior]
}

// ── Classification ──────────────────────────────────────────────────────────

const POSITION_GAIN_THRESHOLD = 2     // ranks improved
const POSITION_LOSS_THRESHOLD = 3     // ranks dropped
const IMPRESSION_LOSS_PCT = 0.25
const CTR_LOSS_PP = 0.005             // 0.5 percentage points expressed as decimal

function classify(
  current: PageQueryRow | null,
  prior: PageQueryRow | null,
): { signal: Signal; deltas: Pick<DiffSignal, 'delta_position' | 'delta_impressions' | 'delta_clicks' | 'delta_ctr'> } {
  if (!prior && current) {
    return {
      signal: 'new',
      deltas: { delta_position: null, delta_impressions: null, delta_clicks: null, delta_ctr: null },
    }
  }
  if (prior && !current) {
    return {
      signal: 'lost',
      deltas: { delta_position: null, delta_impressions: null, delta_clicks: null, delta_ctr: null },
    }
  }
  if (!prior || !current) {
    // Both null shouldn't happen but guard
    return {
      signal: 'flat',
      deltas: { delta_position: null, delta_impressions: null, delta_clicks: null, delta_ctr: null },
    }
  }

  const delta_position = current.position - prior.position // negative is good
  const delta_impressions = current.impressions - prior.impressions
  const delta_clicks = current.clicks - prior.clicks
  const delta_ctr = current.ctr - prior.ctr

  // Position improved ≥2 ranks (delta is negative) AND impressions held or grew
  if (delta_position <= -POSITION_GAIN_THRESHOLD && delta_impressions >= 0) {
    return {
      signal: 'winning',
      deltas: { delta_position, delta_impressions, delta_clicks, delta_ctr },
    }
  }

  const droppedRanks = delta_position >= POSITION_LOSS_THRESHOLD
  const droppedImpr =
    prior.impressions > 0 && delta_impressions / prior.impressions <= -IMPRESSION_LOSS_PCT
  const droppedCtr = delta_ctr <= -CTR_LOSS_PP

  if (droppedRanks || droppedImpr || droppedCtr) {
    return {
      signal: 'losing',
      deltas: { delta_position, delta_impressions, delta_clicks, delta_ctr },
    }
  }

  return {
    signal: 'flat',
    deltas: { delta_position, delta_impressions, delta_clicks, delta_ctr },
  }
}

function diffSnapshots(current: SnapshotRow, prior: SnapshotRow): DiffSignal[] {
  const priorMap = new Map<string, PageQueryRow>()
  for (const r of prior.rows) priorMap.set(`${r.page}::${r.query}`, r)
  const currentMap = new Map<string, PageQueryRow>()
  for (const r of current.rows) currentMap.set(`${r.page}::${r.query}`, r)

  const seen = new Set<string>()
  const out: DiffSignal[] = []

  for (const [key, cur] of currentMap) {
    seen.add(key)
    const pri = priorMap.get(key) ?? null
    const { signal, deltas } = classify(cur, pri)
    out.push({
      page: cur.page,
      query: cur.query,
      current: {
        position: cur.position,
        clicks: cur.clicks,
        impressions: cur.impressions,
        ctr: cur.ctr,
      },
      prior: pri
        ? { position: pri.position, clicks: pri.clicks, impressions: pri.impressions, ctr: pri.ctr }
        : null,
      ...deltas,
      signal,
    })
  }

  // Lost pairs — in prior, missing from current
  for (const [key, pri] of priorMap) {
    if (seen.has(key)) continue
    const { signal, deltas } = classify(null, pri)
    out.push({
      page: pri.page,
      query: pri.query,
      current: null,
      prior: {
        position: pri.position,
        clicks: pri.clicks,
        impressions: pri.impressions,
        ctr: pri.ctr,
      },
      ...deltas,
      signal,
    })
  }

  return out
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase admin env not set')
  }

  let current: SnapshotRow
  let prior: SnapshotRow

  if (fromArg && toArg) {
    const from = fromArg.split('=')[1]
    const to = toArg.split('=')[1]
    const a = await fetchSnapshot(to, scope)
    const b = await fetchSnapshot(from, scope)
    if (!a) throw new Error(`no snapshot for ${to}/${scope}`)
    if (!b) throw new Error(`no snapshot for ${from}/${scope}`)
    current = a
    prior = b
  } else {
    const [c, p] = await fetchLatestTwo(scope)
    current = c
    prior = p
  }

  console.log(`Diffing scope=${scope}`)
  console.log(`  current: ${current.snapshot_date} (${current.rows.length} rows)`)
  console.log(`  prior:   ${prior.snapshot_date} (${prior.rows.length} rows)`)

  const signals = diffSnapshots(current, prior)
  const counts: Record<Signal, number> = {
    winning: 0,
    losing: 0,
    flat: 0,
    new: 0,
    lost: 0,
  }
  for (const s of signals) counts[s.signal]++

  console.log('\nSignal counts:')
  for (const k of Object.keys(counts) as Signal[]) {
    console.log(`  ${k.padEnd(8)} ${counts[k]}`)
  }

  if (isDryRun) {
    console.log('\nDry-run — skipping DB write')
    return
  }

  const supa = getAdminClient()
  const { error } = await supa
    .from('gsc_diffs')
    .upsert(
      {
        from_date: prior.snapshot_date,
        to_date: current.snapshot_date,
        scope,
        signals: signals as never,
        signals_count: signals.length,
        winners_count: counts.winning,
        losers_count: counts.losing,
        new_pairs_count: counts.new,
        lost_pairs_count: counts.lost,
        generated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'from_date,to_date,scope' },
    )
  if (error) throw new Error(`upsert gsc_diffs: ${error.message}`)
  console.log('\n✓ wrote gsc_diffs row')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// Re-exported for unit tests in /lib/seo/triage.ts (Doc 13 §3) and the
// snapshot-gsc cron's optional inline diff.
export { classify, diffSnapshots }
export type { DiffSignal, Signal, SnapshotRow, PageQueryRow }
