/**
 * Phase 7A — GSC keyword mining + opportunity scoring.
 *
 * For every published tool, pulls the last 90 days of GSC query data
 * scoped to /tools/{slug}, filters queries ranking positions 5-20
 * (page 1 but not clicking — high-intent, rankable), buckets each
 * query into an intent (compare / alternative / worth-it / how-to /
 * use-case), and writes a prioritized opportunity JSON that drives
 * the order of Phase 7B-7M generation.
 *
 * USAGE:
 *   npm run mine:gsc:dry                      # list tools, no GSC calls
 *   npm run mine:gsc:apply                    # full run, writes JSON
 *   npm run mine:gsc:apply -- --limit=20      # cap to N tools (testing)
 *   npm run mine:gsc:apply -- --slug=kit      # one tool
 *
 * REQUIRED ENV (in .env.local — see docs/marketing/10-gsc-keyword-mining.md):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GSC_OAUTH_CLIENT_PATH              (downloaded OAuth client_secret JSON)
 *   GSC_OAUTH_TOKEN_PATH               (refresh_token saved by oauth bootstrap)
 *   GSC_SITE_URL                       (default: sc-domain:rightaichoice.com)
 *
 * One-time setup: `npm run gsc:oauth:bootstrap` (browser-based "Allow" flow).
 *
 * OUTPUT:
 *   scripts/.gsc-opportunities.json    (consumed by 7B/7C/7D/7E/7L/7M)
 *   scripts/.gsc-mining-progress.json  (resume checkpoint)
 *
 * QUOTA: 1,200 queries/min/project. We run 5 concurrent — well under.
 * For 1,178 tools at ~1.5s/call with 5 parallelism, full run ≈ 6 min.
 */
export {}

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { queriesForPage, type GscRow } from '../lib/seo/gsc-client'

const PROGRESS_FILE = join(process.cwd(), 'scripts', '.gsc-mining-progress.json')
const OUTPUT_FILE = join(process.cwd(), 'scripts', '.gsc-opportunities.json')

const DEFAULT_SITE_URL = 'sc-domain:rightaichoice.com'
const LOOKBACK_DAYS = 90
const MIN_POSITION = 5     // page 1 lower half
const MAX_POSITION = 20    // top of page 2
const CONCURRENCY = 5

type PageType = 'compare' | 'alternative' | 'worth-it' | 'how-to' | 'use-case' | 'unbucketed'

type Opportunity = {
  tool_slug: string
  page_path: string
  page_type: PageType
  target_keyword: string
  current_position: number
  impressions: number
  clicks: number
  ctr: number
  // impressions weighted inversely by position — closer to #1 = higher
  // priority. Used by downstream phases to decide generation order.
  est_volume_score: number
}

type Output = {
  generated_at: string
  site: string
  lookback_days: number
  position_range: [number, number]
  total_tools_processed: number
  total_opportunities: number
  bucket_totals: Record<PageType, number>
  opportunities: Opportunity[]
}

type Progress = { processed: string[]; opportunities: Opportunity[] }

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isApply = args.includes('--apply')
const limitArg = args.find((a) => a.startsWith('--limit='))
const slugArg = args.find((a) => a.startsWith('--slug='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
const targetSlug = slugArg ? slugArg.split('=')[1] : undefined

if (!isDryRun && !isApply) {
  console.error('Pass --dry-run or --apply (see script header for examples).')
  process.exit(1)
}

const SITE_URL = process.env.GSC_SITE_URL || DEFAULT_SITE_URL

// ── Intent bucketing (regex heuristics) ─────────────────────────────────────

function bucketQuery(query: string): PageType {
  const q = query.toLowerCase()
  // Order matters — compare wins over alternative when both keywords present
  if (/\b(vs\.?|versus|compared\s+to)\b/i.test(q)) return 'compare'
  if (/\b(alternative|alternatives|instead\s+of|replace|replacement\s+for)\b/i.test(q))
    return 'alternative'
  if (/\b(worth\s+it|worth\s+the|legit|scam|reliable|trustworthy|review|reviews)\b/i.test(q))
    return 'worth-it'
  if (/\b(how\s+to|tutorial|guide|setup|set\s+up|getting\s+started|integrate)\b/i.test(q))
    return 'how-to'
  if (/\b(best|top|for\s+\w+|use\s+case|tools\s+for)\b/i.test(q)) return 'use-case'
  return 'unbucketed'
}

// ── Date helpers ────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function dateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  end.setDate(end.getDate() - 3) // GSC has 2-3 day lag; back off to fully-reported window
  const start = new Date(end)
  start.setDate(start.getDate() - LOOKBACK_DAYS)
  return { startDate: isoDate(start), endDate: isoDate(end) }
}

// ── Concurrency runner (no external dep) ────────────────────────────────────

async function pMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ── Progress checkpoint ─────────────────────────────────────────────────────

function loadProgress(): Progress {
  if (!existsSync(PROGRESS_FILE)) return { processed: [], opportunities: [] }
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) as Progress
}

function saveProgress(p: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2))
}

// ── Main ────────────────────────────────────────────────────────────────────

async function fetchPublishedSlugs(): Promise<string[]> {
  // PostgREST hard-caps responses at 1000 rows on this project — chunk
  // until exhausted so the full ~1,178-tool catalog comes through.
  const supa = getAdminClient()
  const all: string[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const to = from + PAGE - 1
    const { data, error } = await supa
      .from('tools')
      .select('slug')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .range(from, to)
    if (error) throw error
    const rows = (data ?? []) as Array<{ slug: string }>
    all.push(...rows.map((r) => r.slug))
    if (rows.length < PAGE) break
  }
  return all
}

async function processTool(
  slug: string,
  startDate: string,
  endDate: string
): Promise<Opportunity[]> {
  const pagePath = `/tools/${slug}`
  let rows: GscRow[]
  try {
    rows = await queriesForPage(SITE_URL, pagePath, startDate, endDate)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  ✗ ${slug} — GSC error: ${msg}`)
    return []
  }
  const opps: Opportunity[] = []
  for (const row of rows) {
    if (row.position < MIN_POSITION || row.position > MAX_POSITION) continue
    const query = row.keys[0]
    if (!query) continue
    const page_type = bucketQuery(query)
    const est_volume_score = Math.round((row.impressions / row.position) * 10) / 10
    opps.push({
      tool_slug: slug,
      page_path: pagePath,
      page_type,
      target_keyword: query,
      current_position: Math.round(row.position * 10) / 10,
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: Math.round(row.ctr * 10000) / 10000,
      est_volume_score,
    })
  }
  return opps
}

async function main() {
  const allSlugs = await fetchPublishedSlugs()
  let slugs = allSlugs
  if (targetSlug) slugs = slugs.filter((s) => s === targetSlug)
  if (limit) slugs = slugs.slice(0, limit)

  console.log(`Site URL:     ${SITE_URL}`)
  console.log(`Lookback:     ${LOOKBACK_DAYS} days`)
  console.log(`Position:     ${MIN_POSITION}–${MAX_POSITION}`)
  console.log(`Tools:        ${slugs.length} (of ${allSlugs.length} published)`)
  console.log(`Mode:         ${isDryRun ? 'DRY-RUN (no GSC calls)' : 'APPLY (real GSC calls)'}`)
  console.log('')

  if (isDryRun) {
    console.log('Sample tools to be queried:')
    for (const s of slugs.slice(0, 10)) console.log(`  - /tools/${s}`)
    if (slugs.length > 10) console.log(`  ... and ${slugs.length - 10} more`)
    console.log('')
    console.log(`Re-run with \`npm run mine:gsc:apply\` to make real GSC API calls.`)
    return
  }

  // ─── APPLY mode ───
  if (!process.env.GSC_OAUTH_CLIENT_PATH || !process.env.GSC_OAUTH_TOKEN_PATH) {
    console.error(
      '\n❌ GSC OAuth not set up.\n' +
        '   Set GSC_OAUTH_CLIENT_PATH + GSC_OAUTH_TOKEN_PATH in .env.local,\n' +
        '   then run `npm run gsc:oauth:bootstrap` to do the one-time browser flow.\n' +
        '   See docs/marketing/10-gsc-keyword-mining.md.\n'
    )
    process.exit(1)
  }

  const { startDate, endDate } = dateRange()
  console.log(`Date range:   ${startDate} → ${endDate}`)
  console.log('')

  const progress = loadProgress()
  const todo = slugs.filter((s) => !progress.processed.includes(s))
  console.log(`Resuming: ${progress.processed.length} done, ${todo.length} remaining\n`)

  let processed = 0
  await pMap(todo, CONCURRENCY, async (slug) => {
    const opps = await processTool(slug, startDate, endDate)
    progress.processed.push(slug)
    progress.opportunities.push(...opps)
    processed += 1
    if (processed % 25 === 0) {
      saveProgress(progress)
      console.log(
        `  · ${processed}/${todo.length} done — ${progress.opportunities.length} opportunities so far`
      )
    }
  })
  saveProgress(progress)

  // ─── Sort + bucket totals ───
  progress.opportunities.sort((a, b) => b.est_volume_score - a.est_volume_score)
  const bucketTotals: Record<PageType, number> = {
    compare: 0,
    alternative: 0,
    'worth-it': 0,
    'how-to': 0,
    'use-case': 0,
    unbucketed: 0,
  }
  for (const o of progress.opportunities) bucketTotals[o.page_type] += 1

  const output: Output = {
    generated_at: new Date().toISOString(),
    site: SITE_URL,
    lookback_days: LOOKBACK_DAYS,
    position_range: [MIN_POSITION, MAX_POSITION],
    total_tools_processed: progress.processed.length,
    total_opportunities: progress.opportunities.length,
    bucket_totals: bucketTotals,
    opportunities: progress.opportunities,
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))
  console.log('')
  console.log(`✓ Wrote ${progress.opportunities.length} opportunities to ${OUTPUT_FILE}`)
  console.log(`  Bucket totals:`, bucketTotals)
  console.log('')
  console.log(`Top 5 by est_volume_score:`)
  for (const o of progress.opportunities.slice(0, 5)) {
    console.log(
      `  · ${o.tool_slug.padEnd(20)} | ${o.page_type.padEnd(11)} | pos ${o.current_position
        .toString()
        .padStart(5)} | "${o.target_keyword}"`
    )
  }
}

import { withLock } from './_lib/lockfile' // BUG-21: serialize this stateful job
withLock('mine-gsc-keywords', main).catch((err) => {
  console.error('\n❌ Fatal error:', err)
  process.exit(1)
})
