import { cronRoute } from '@/lib/pipelines/with-logging'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { querySearchAnalytics, type GscRow } from '@/lib/seo/gsc-client'

// Weekly GSC snapshot cron.
//
// Runs every Monday at 06:30 UTC (right after resubmit-sitemap-gsc at 06:00).
// Pulls last 7d + 28d of Search Console data per scope, stores both as
// rows in gsc_snapshots, then computes the diff vs the prior snapshot
// (silently skips diff on the first run when no prior data exists).
//
// Persistent baseline = weekly-loop dashboard can pull from gsc_diffs and
// classify every page+query pair as winning / losing / new / lost / flat.
//
// REQUIRED VERCEL ENV (already set for resubmit-sitemap-gsc cron):
//   GSC_OAUTH_CLIENT_ID
//   GSC_OAUTH_CLIENT_SECRET
//   GSC_OAUTH_REFRESH_TOKEN
//   GSC_SITE_URL                (default: sc-domain:rightaichoice.com)
//   CRON_SECRET                 (so only Vercel can hit this route)

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:rightaichoice.com'
const ROWS_PER_REQUEST = 25_000
const MAX_PAGES = 4

type Scope = '7d' | '28d'

type Totals = { clicks: number; impressions: number; ctr: number; position: number }

type PageQueryRow = {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function windowFor(scope: Scope): { startDate: string; endDate: string } {
  const days = scope === '7d' ? 7 : 28
  const end = new Date()
  end.setDate(end.getDate() - 3) // GSC has ~2-3d reporting lag
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  return { startDate: isoDate(start), endDate: isoDate(end) }
}

async function pullTotals(scope: Scope): Promise<Totals> {
  const { startDate, endDate } = windowFor(scope)
  const rows = await querySearchAnalytics(SITE_URL, {
    startDate, endDate, dimensions: [], rowLimit: 1,
  })
  if (rows.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  const r = rows[0]
  return { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }
}

async function pullPageQueryRows(scope: Scope): Promise<PageQueryRow[]> {
  const { startDate, endDate } = windowFor(scope)
  const all: PageQueryRow[] = []
  for (let pageIdx = 0; pageIdx < MAX_PAGES; pageIdx++) {
    const batch: GscRow[] = await querySearchAnalytics(SITE_URL, {
      startDate, endDate,
      dimensions: ['page', 'query'],
      rowLimit: ROWS_PER_REQUEST,
      startRow: pageIdx * ROWS_PER_REQUEST,
    })
    for (const r of batch) {
      all.push({
        page: r.keys[0], query: r.keys[1],
        clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position,
      })
    }
    if (batch.length < ROWS_PER_REQUEST) break
  }
  return all
}

// ── Diff helpers (mirrors scripts/diff-gsc-snapshots.ts classify()) ─────────

type Signal = 'winning' | 'losing' | 'flat' | 'new' | 'lost'
const POSITION_GAIN_THRESHOLD = 2
const POSITION_LOSS_THRESHOLD = 3
const IMPRESSION_LOSS_PCT = 0.25
const CTR_LOSS_PP = 0.005

function classify(current: PageQueryRow | null, prior: PageQueryRow | null) {
  if (!prior && current) return { signal: 'new' as Signal, dp: null, di: null, dc: null, dctr: null }
  if (prior && !current) return { signal: 'lost' as Signal, dp: null, di: null, dc: null, dctr: null }
  if (!prior || !current) return { signal: 'flat' as Signal, dp: null, di: null, dc: null, dctr: null }
  const dp = current.position - prior.position
  const di = current.impressions - prior.impressions
  const dc = current.clicks - prior.clicks
  const dctr = current.ctr - prior.ctr
  if (dp <= -POSITION_GAIN_THRESHOLD && di >= 0) return { signal: 'winning' as Signal, dp, di, dc, dctr }
  const droppedRanks = dp >= POSITION_LOSS_THRESHOLD
  const droppedImpr = prior.impressions > 0 && di / prior.impressions <= -IMPRESSION_LOSS_PCT
  const droppedCtr = dctr <= -CTR_LOSS_PP
  if (droppedRanks || droppedImpr || droppedCtr) return { signal: 'losing' as Signal, dp, di, dc, dctr }
  return { signal: 'flat' as Signal, dp, di, dc, dctr }
}

async function writeSnapshot(scope: Scope, snapshotDate: string) {
  const [totals, rows] = await Promise.all([pullTotals(scope), pullPageQueryRows(scope)])
  const supa = getAdminClient()
  const { error } = await supa
    .from('gsc_snapshots')
    .upsert(
      {
        snapshot_date: snapshotDate,
        scope,
        totals: totals as never,
        rows: rows as never,
        rows_count: rows.length,
        source: 'querySearchAnalytics',
        generated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'snapshot_date,scope' },
    )
  if (error) throw new Error(`upsert gsc_snapshots ${scope}: ${error.message}`)
  return { totals, rowsCount: rows.length }
}

async function writeDiff(scope: Scope, snapshotDate: string) {
  const supa = getAdminClient()
  // Pull current + prior snapshot for this scope. Prior must be older than today.
  const { data: snaps, error } = await supa
    .from('gsc_snapshots')
    .select('snapshot_date, rows')
    .eq('scope', scope)
    .order('snapshot_date', { ascending: false })
    .limit(2)
  if (error) throw new Error(`fetch snapshots for diff: ${error.message}`)
  const list = (snaps as { snapshot_date: string; rows: PageQueryRow[] }[]) ?? []
  if (list.length < 2) return { skipped: 'no_prior_snapshot' as const }

  const [current, prior] = list
  const priorMap = new Map<string, PageQueryRow>()
  for (const r of prior.rows) priorMap.set(`${r.page}::${r.query}`, r)
  const currentMap = new Map<string, PageQueryRow>()
  for (const r of current.rows) currentMap.set(`${r.page}::${r.query}`, r)

  type DiffOut = { page: string; query: string; signal: Signal; current: PageQueryRow | null; prior: PageQueryRow | null; delta_position: number | null; delta_impressions: number | null; delta_clicks: number | null; delta_ctr: number | null }
  const out: DiffOut[] = []
  const seen = new Set<string>()
  for (const [k, cur] of currentMap) {
    seen.add(k)
    const pri = priorMap.get(k) ?? null
    const c = classify(cur, pri)
    out.push({ page: cur.page, query: cur.query, signal: c.signal, current: cur, prior: pri, delta_position: c.dp, delta_impressions: c.di, delta_clicks: c.dc, delta_ctr: c.dctr })
  }
  for (const [k, pri] of priorMap) {
    if (seen.has(k)) continue
    const c = classify(null, pri)
    out.push({ page: pri.page, query: pri.query, signal: c.signal, current: null, prior: pri, delta_position: c.dp, delta_impressions: c.di, delta_clicks: c.dc, delta_ctr: c.dctr })
  }

  const counts: Record<Signal, number> = { winning: 0, losing: 0, flat: 0, new: 0, lost: 0 }
  for (const s of out) counts[s.signal]++

  const { error: upErr } = await supa
    .from('gsc_diffs')
    .upsert(
      {
        from_date: prior.snapshot_date,
        to_date: current.snapshot_date,
        scope,
        signals: out as never,
        signals_count: out.length,
        winners_count: counts.winning,
        losers_count: counts.losing,
        new_pairs_count: counts.new,
        lost_pairs_count: counts.lost,
        generated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'from_date,to_date,scope' },
    )
  if (upErr) throw new Error(`upsert gsc_diffs: ${upErr.message}`)
  return { from: prior.snapshot_date, to: current.snapshot_date, counts }
}

export const GET = cronRoute({ pipelineKey: 'snapshot-gsc' }, async (ctx) => {
  const snapshotDate = isoDate(new Date())
  const summary: Record<string, unknown> = { snapshot_date: snapshotDate, site: SITE_URL }

  const scopes: Scope[] = ['7d', '28d']
  for (const scope of scopes) {
    const { totals, rowsCount } = await writeSnapshot(scope, snapshotDate)
    summary[scope] = { totals, rows_count: rowsCount }
    const diff = await writeDiff(scope, snapshotDate)
    summary[`${scope}_diff`] = diff
  }

  ctx.recordItems({ processed: 2, succeeded: 2 })
  ctx.recordMetadata(summary)
  return { ok: true, ...summary }
})
