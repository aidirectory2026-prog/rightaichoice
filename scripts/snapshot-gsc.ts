/**
 * Day 1 (2026-05-20) — Weekly GSC snapshot.
 *
 * Pulls last 7d + 28d of Search Console data for the property and writes
 * each result set as one row in `gsc_snapshots`. Paginates page+query
 * dimension reads (GSC caps at 25,000 rows per request) so we capture the
 * full long tail. Idempotent — re-running for the same (date, scope) upserts.
 *
 * USAGE:
 *   npm run snapshot:gsc:dry                # show what would be pulled
 *   npm run snapshot:gsc                    # pull both scopes, write to DB
 *   npm run snapshot:gsc -- --scope=7d      # one scope only
 *   npm run snapshot:gsc -- --date=2026-05-20  # back-date the snapshot row
 *
 * REQUIRED ENV:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GSC_OAUTH_CLIENT_PATH
 *   GSC_OAUTH_TOKEN_PATH
 *   GSC_SITE_URL                  (default: sc-domain:rightaichoice.com)
 *
 * QUOTA: 1,200 queries/min/project. This script makes ~10 calls per scope
 * (one totals call + paginated page+query reads). Comfortable margin.
 */
export {}

import { getAdminClient } from '../lib/cron/supabase-admin'
import { querySearchAnalytics, type GscRow } from '../lib/seo/gsc-client'

const DEFAULT_SITE_URL = 'sc-domain:rightaichoice.com'
const ROWS_PER_REQUEST = 25000           // GSC hard cap per call
const MAX_PAGES = 4                      // 4 × 25k = 100k rows max per scope

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const scopeArg = args.find((a) => a.startsWith('--scope='))
const dateArg = args.find((a) => a.startsWith('--date='))
const onlyScope = scopeArg ? (scopeArg.split('=')[1] as '7d' | '28d') : undefined
const overrideDate = dateArg ? dateArg.split('=')[1] : undefined

const SITE_URL = process.env.GSC_SITE_URL || DEFAULT_SITE_URL

// ── Date helpers ────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * GSC has a ~2-3 day reporting lag. End each window 3 days back so we get
 * fully-reported data. Window is inclusive of both start and end.
 */
function windowFor(scope: '7d' | '28d'): { startDate: string; endDate: string } {
  const days = scope === '7d' ? 7 : 28
  const end = new Date()
  end.setDate(end.getDate() - 3)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  return { startDate: isoDate(start), endDate: isoDate(end) }
}

// ── Snapshot core ───────────────────────────────────────────────────────────

type Totals = {
  clicks: number
  impressions: number
  ctr: number
  position: number
}

async function pullTotals(scope: '7d' | '28d'): Promise<Totals> {
  const { startDate, endDate } = windowFor(scope)
  const rows = await querySearchAnalytics(SITE_URL, {
    startDate,
    endDate,
    dimensions: [],
    rowLimit: 1,
  })
  if (rows.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  const r = rows[0]
  return { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position }
}

type PageQueryRow = {
  page: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

async function pullPageQueryRows(scope: '7d' | '28d'): Promise<PageQueryRow[]> {
  const { startDate, endDate } = windowFor(scope)
  const all: PageQueryRow[] = []
  for (let pageIdx = 0; pageIdx < MAX_PAGES; pageIdx++) {
    const batch: GscRow[] = await querySearchAnalytics(SITE_URL, {
      startDate,
      endDate,
      dimensions: ['page', 'query'],
      rowLimit: ROWS_PER_REQUEST,
      startRow: pageIdx * ROWS_PER_REQUEST,
    })
    for (const r of batch) {
      all.push({
        page: r.keys[0],
        query: r.keys[1],
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        position: r.position,
      })
    }
    if (batch.length < ROWS_PER_REQUEST) break
  }
  return all
}

async function snapshotOne(scope: '7d' | '28d', snapshotDate: string) {
  console.log(`\n[${scope}] window:`, windowFor(scope))

  const [totals, rows] = await Promise.all([pullTotals(scope), pullPageQueryRows(scope)])

  console.log(
    `[${scope}] totals: clicks=${totals.clicks} impr=${totals.impressions} ` +
      `ctr=${(totals.ctr * 100).toFixed(2)}% pos=${totals.position.toFixed(1)}`,
  )
  console.log(`[${scope}] page+query rows pulled: ${rows.length}`)

  if (isDryRun) {
    console.log(`[${scope}] dry-run — skipping DB write`)
    return
  }

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
  if (error) throw new Error(`upsert failed for ${scope}: ${error.message}`)
  console.log(`[${scope}] ✓ wrote snapshot row`)
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!isDryRun && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('Supabase admin env not set')
  }
  if (!process.env.GSC_OAUTH_CLIENT_PATH || !process.env.GSC_OAUTH_TOKEN_PATH) {
    throw new Error('GSC OAuth env not set — run `npm run gsc:oauth:bootstrap`')
  }

  const snapshotDate = overrideDate || isoDate(new Date())
  console.log(`Site:           ${SITE_URL}`)
  console.log(`Snapshot date:  ${snapshotDate}`)
  console.log(`Mode:           ${isDryRun ? 'DRY-RUN' : 'APPLY'}`)

  const scopes: Array<'7d' | '28d'> = onlyScope ? [onlyScope] : ['7d', '28d']
  for (const scope of scopes) {
    await snapshotOne(scope, snapshotDate)
  }

  console.log('\n✓ snapshot complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
