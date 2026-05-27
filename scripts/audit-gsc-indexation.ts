/**
 * Phase 7N.audit — GSC URL-Inspection bucket monitor.
 *
 * For every URL we publish (tools, comparisons, categories, best, stacks,
 * roles, blog posts, static), call the Google Search Console URL Inspection
 * API and bucket the result by `coverageState`. Output:
 *
 *   1. `scripts/.gsc-indexation-report.json` — per-URL inspection result
 *   2. Console summary table — bucket totals × page type
 *
 * The killer signal we're watching:
 *   "Discovered - currently not indexed"   ← authority/crawl-budget bottleneck
 *   "Crawled - currently not indexed"      ← content-quality bottleneck
 *
 * Re-running daily before/after each Phase 7 tranche tells us *which*
 * problem each tranche moves the needle on, and lets us gate further
 * generation on real indexation gain rather than guesswork.
 *
 * USAGE:
 *   npm run audit:indexation:dry                     # list URLs only
 *   npm run audit:indexation                          # default: 100/type, sample
 *   npm run audit:indexation -- --type=compare        # one page type
 *   npm run audit:indexation -- --limit-per-type=50   # tighter sample
 *   npm run audit:indexation -- --all                 # full audit (multi-day under quota)
 *   npm run audit:indexation -- --reset               # wipe checkpoint, start fresh
 *
 * REQUIRED ENV (same as mine-gsc-keywords.ts):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GSC_OAUTH_CLIENT_PATH
 *   GSC_OAUTH_TOKEN_PATH
 *   GSC_SITE_URL                       (default: sc-domain:rightaichoice.com)
 *
 * QUOTA (Search Console URL Inspection):
 *   - 2,000 inspections/day per property
 *   - 600/min per project
 *   We default to 100/type × ~9 types = ~900/run. Re-runnable daily.
 *   --all does the full ~4,000 — will hit the daily cap, checkpoint resumes
 *   the next day automatically.
 *
 * OUTPUT:
 *   scripts/.gsc-indexation-report.json   — full structured results
 *   scripts/.gsc-indexation-progress.json — resume checkpoint
 */
export {}

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { inspectUrl } from '../lib/seo/gsc-client'

const PROGRESS_FILE = join(process.cwd(), 'scripts', '.gsc-indexation-progress.json')
const OUTPUT_FILE = join(process.cwd(), 'scripts', '.gsc-indexation-report.json')

const BASE_URL = 'https://rightaichoice.com'
const DEFAULT_SITE_URL = 'sc-domain:rightaichoice.com'

// Conservative concurrency. URL Inspection is rate-limited to 600/min
// per project = 10/sec absolute max. We run 4 in parallel with a 250ms
// gap → ~16 calls/sec headroom but we never hit it because each call
// takes ~600ms anyway.
const CONCURRENCY = 4

type PageType =
  | 'tool'
  | 'compare'
  | 'category'
  | 'best'
  | 'stack'
  | 'role'
  | 'blog'
  | 'static'
  | 'other'

type UrlEntry = { url: string; type: PageType }

type Inspection = {
  url: string
  type: PageType
  coverageState: string
  verdict: string
  indexingState: string
  lastCrawlTime: string | null
  pageFetchState: string
  googleCanonical: string | null
  userCanonical: string | null
  inspectedAt: string
}

type Report = {
  generated_at: string
  site: string
  total_urls_inspected: number
  bucket_totals: Record<string, number>
  bucket_by_type: Record<PageType, Record<string, number>>
  inspections: Inspection[]
}

type Progress = { processed_urls: string[]; inspections: Inspection[] }

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isApply = args.includes('--apply') || (!isDryRun && !args.includes('--reset'))
const wantsReset = args.includes('--reset')
const wantsAll = args.includes('--all')
// Phase 9 B4 (2026-05-28): --ingest-only reads the existing checkpoint
// and bulk-upserts into gsc_url_inspections without making fresh GSC
// calls. Use after migration 114 to backfill the table from the most
// recent on-disk audit run.
const ingestOnly = args.includes('--ingest-only')
const limitArg = args.find((a) => a.startsWith('--limit-per-type='))
const typeArg = args.find((a) => a.startsWith('--type='))
const limitPerType = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100
const onlyType = typeArg ? (typeArg.split('=')[1] as PageType) : undefined

const SITE_URL = process.env.GSC_SITE_URL || DEFAULT_SITE_URL

// ── URL collection ──────────────────────────────────────────────────────────

const PAGE_SIZE = 1000

async function fetchTools(): Promise<UrlEntry[]> {
  const supa = getAdminClient()
  const all: UrlEntry[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supa
      .from('tools')
      .select('slug')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ slug: string }>
    for (const r of rows) all.push({ url: `${BASE_URL}/tools/${r.slug}`, type: 'tool' })
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

async function fetchComparisons(): Promise<UrlEntry[]> {
  const supa = getAdminClient()
  const all: UrlEntry[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supa
      .from('tool_comparisons')
      .select('slug')
      .eq('is_editorial', true)
      .order('published_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ slug: string }>
    for (const r of rows) all.push({ url: `${BASE_URL}/compare/${r.slug}`, type: 'compare' })
    if (rows.length < PAGE_SIZE) break
  }
  return all
}

async function fetchCategories(): Promise<UrlEntry[]> {
  const supa = getAdminClient()
  const { data, error } = await supa.from('categories').select('slug')
  if (error) throw error
  const rows = (data ?? []) as Array<{ slug: string }>
  return rows.map((r) => ({ url: `${BASE_URL}/categories/${r.slug}`, type: 'category' as const }))
}

async function fetchStaticUrls(): Promise<UrlEntry[]> {
  // Statics + listing roots from app/sitemap.ts. Not pulled from DB so they
  // never go stale — kept in sync manually if sitemap changes.
  const paths = [
    '',
    '/tools',
    '/categories',
    '/recommend',
    '/ai-chat',
    '/viability',
    '/viability/at-risk',
    '/viability/safe-bets',
    '/methodology',
    '/team',
    '/best',
    '/stacks',
    '/for',
    '/blog',
  ]
  return paths.map((p) => ({ url: `${BASE_URL}${p || '/'}`, type: 'static' as const }))
}

async function fetchBest(): Promise<UrlEntry[]> {
  const { BEST_PAGES } = await import('../lib/data/best-pages')
  return BEST_PAGES.map((p: { slug: string }) => ({
    url: `${BASE_URL}/best/${p.slug}`,
    type: 'best' as const,
  }))
}

async function fetchStacks(): Promise<UrlEntry[]> {
  const { STACKS } = await import('../lib/data/stacks')
  return STACKS.map((s: { slug: string }) => ({
    url: `${BASE_URL}/stacks/${s.slug}`,
    type: 'stack' as const,
  }))
}

async function fetchRoles(): Promise<UrlEntry[]> {
  const { ROLE_PAGES } = await import('../lib/data/role-pages')
  return ROLE_PAGES.map((r: { slug: string }) => ({
    url: `${BASE_URL}/for/${r.slug}`,
    type: 'role' as const,
  }))
}

async function fetchBlog(): Promise<UrlEntry[]> {
  const { getAllPosts } = await import('../lib/data/blog')
  const posts = getAllPosts() as Array<{ slug: string }>
  return posts.map((p) => ({ url: `${BASE_URL}/blog/${p.slug}`, type: 'blog' as const }))
}

async function collectAllUrls(): Promise<UrlEntry[]> {
  const [tools, comparisons, categories, best, stacks, roles, blog, statics] = await Promise.all([
    fetchTools(),
    fetchComparisons(),
    fetchCategories(),
    fetchBest(),
    fetchStacks(),
    fetchRoles(),
    fetchBlog(),
    fetchStaticUrls(),
  ])
  return [...statics, ...tools, ...comparisons, ...categories, ...best, ...stacks, ...roles, ...blog]
}

// ── Sampling ────────────────────────────────────────────────────────────────

function sampleByType(urls: UrlEntry[], perType: number): UrlEntry[] {
  if (wantsAll) return urls
  const byType = new Map<PageType, UrlEntry[]>()
  for (const u of urls) {
    if (!byType.has(u.type)) byType.set(u.type, [])
    byType.get(u.type)!.push(u)
  }
  const sampled: UrlEntry[] = []
  for (const [, list] of byType) {
    // Already DB-ordered (view_count desc for tools, published_at desc for
    // comparisons). Take the head so we sample our highest-value URLs.
    sampled.push(...list.slice(0, perType))
  }
  return sampled
}

// ── Concurrency runner ──────────────────────────────────────────────────────

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
  if (wantsReset || !existsSync(PROGRESS_FILE)) return { processed_urls: [], inspections: [] }
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) as Progress
}

function saveProgress(p: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2))
}

// ── Persistence ─────────────────────────────────────────────────────────────

// Phase 9 B4 (2026-05-28): mirror the JSON output into gsc_url_inspections
// so runtime code (sibling-tools rail, IndexNow cron) can read indexation
// state directly from Postgres. Batched in chunks of 500 because Supabase's
// PostgREST upsert has a default per-request payload ceiling we want to
// stay well under for 2,000-row runs.
const UPSERT_CHUNK = 500

async function persistInspections(inspections: Inspection[]): Promise<void> {
  if (inspections.length === 0) return
  const supa = getAdminClient()
  const rows = inspections.map((i) => ({
    url: i.url,
    page_type: i.type,
    coverage_state: i.coverageState,
    verdict: i.verdict,
    indexing_state: i.indexingState,
    page_fetch_state: i.pageFetchState,
    google_canonical: i.googleCanonical,
    user_canonical: i.userCanonical,
    last_crawl_time: i.lastCrawlTime,
    inspected_at: i.inspectedAt,
  }))
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK)
    // Cast: generated Database types pre-date migration 114. Regenerate
    // with `supabase gen types` to drop the assertion.
    const { error } = await (supa as unknown as {
      from: (t: string) => {
        upsert: (
          rows: typeof chunk,
          opts: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>
      }
    })
      .from('gsc_url_inspections')
      .upsert(chunk, { onConflict: 'url' })
    if (error) {
      console.error(
        `  ✗ upsert failed for chunk ${i}-${i + chunk.length}: ${error.message}`,
      )
      throw new Error(error.message)
    }
  }
}

// ── Inspection ──────────────────────────────────────────────────────────────

async function inspectOne(entry: UrlEntry): Promise<Inspection | null> {
  try {
    const result = await inspectUrl(SITE_URL, entry.url)
    const idx = result.inspectionResult.indexStatusResult ?? {}
    return {
      url: entry.url,
      type: entry.type,
      coverageState: idx.coverageState ?? 'Unknown',
      verdict: idx.verdict ?? 'Unknown',
      indexingState: idx.indexingState ?? 'Unknown',
      lastCrawlTime: idx.lastCrawlTime ?? null,
      pageFetchState: idx.pageFetchState ?? 'Unknown',
      googleCanonical: idx.googleCanonical ?? null,
      userCanonical: idx.userCanonical ?? null,
      inspectedAt: new Date().toISOString(),
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
      // Hit daily quota — bail out cleanly so checkpoint persists.
      throw new Error('QUOTA_EXHAUSTED')
    }
    console.error(`  ✗ ${entry.url} — ${msg}`)
    return null
  }
}

// ── Reporting ───────────────────────────────────────────────────────────────

function buildReport(inspections: Inspection[]): Report {
  const bucket_totals: Record<string, number> = {}
  const bucket_by_type: Record<PageType, Record<string, number>> = {
    tool: {},
    compare: {},
    category: {},
    best: {},
    stack: {},
    role: {},
    blog: {},
    static: {},
    other: {},
  }
  for (const i of inspections) {
    bucket_totals[i.coverageState] = (bucket_totals[i.coverageState] ?? 0) + 1
    bucket_by_type[i.type][i.coverageState] = (bucket_by_type[i.type][i.coverageState] ?? 0) + 1
  }
  return {
    generated_at: new Date().toISOString(),
    site: SITE_URL,
    total_urls_inspected: inspections.length,
    bucket_totals,
    bucket_by_type,
    inspections,
  }
}

function printSummary(report: Report) {
  console.log('\n══════════════════════════════════════════════════════')
  console.log(`  GSC INDEXATION REPORT — ${report.total_urls_inspected} URLs inspected`)
  console.log(`  ${report.site}`)
  console.log('══════════════════════════════════════════════════════\n')

  // Sort buckets descending by count.
  const buckets = Object.entries(report.bucket_totals).sort((a, b) => b[1] - a[1])
  console.log('Bucket totals (all page types):')
  for (const [name, count] of buckets) {
    const pct = ((count / report.total_urls_inspected) * 100).toFixed(1)
    const indicator = name.includes('Discovered') || name.includes('Crawled') ? '  ⚠️ ' : '  · '
    console.log(`${indicator}${name.padEnd(50)} ${String(count).padStart(5)}  (${pct}%)`)
  }

  console.log('\nBy page type:')
  const types = Object.keys(report.bucket_by_type) as PageType[]
  for (const t of types) {
    const buckets = report.bucket_by_type[t]
    const total = Object.values(buckets).reduce((a, b) => a + b, 0)
    if (total === 0) continue
    const indexed = buckets['Submitted and indexed'] ?? 0
    const indexedPct = total > 0 ? ((indexed / total) * 100).toFixed(0) : '0'
    console.log(`  ${t.padEnd(10)} ${String(total).padStart(4)} URLs  →  ${String(indexed).padStart(4)} indexed  (${indexedPct}%)`)
  }

  // The two diagnostic buckets we care about most.
  const discovered = report.bucket_totals['Discovered - currently not indexed'] ?? 0
  const crawledNot = report.bucket_totals['Crawled - currently not indexed'] ?? 0
  if (discovered + crawledNot > 0) {
    console.log('\nDiagnostic signal:')
    console.log(
      `  "Discovered - currently not indexed":   ${discovered}  ← authority/crawl-budget bottleneck (fix via Phase 7O)`
    )
    console.log(
      `  "Crawled - currently not indexed":      ${crawledNot}  ← content-quality bottleneck (fix via Phase 4 SOP)`
    )
  }
  console.log('')
  console.log(`Full report:  ${OUTPUT_FILE}`)
  console.log('')
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Phase 9 B4 (2026-05-28): --ingest-only short-circuits the GSC calls
  // and only mirrors the existing checkpoint into gsc_url_inspections.
  // Useful after applying migration 114 to backfill the table.
  if (ingestOnly) {
    const progress = loadProgress()
    if (progress.inspections.length === 0) {
      console.error('No checkpoint found to ingest. Run an audit first.')
      process.exit(1)
    }
    console.log(`Ingesting ${progress.inspections.length} inspections into gsc_url_inspections…`)
    await persistInspections(progress.inspections)
    console.log('✓ Done.')
    return
  }

  const all = await collectAllUrls()
  let urls = all
  if (onlyType) urls = urls.filter((u) => u.type === onlyType)
  urls = sampleByType(urls, limitPerType)

  console.log(`Site URL:        ${SITE_URL}`)
  console.log(`Mode:            ${isDryRun ? 'DRY-RUN (no GSC calls)' : 'APPLY (real GSC calls)'}`)
  console.log(`Total candidate: ${all.length}`)
  console.log(`Will inspect:    ${urls.length}  ${wantsAll ? '(--all)' : `(--limit-per-type=${limitPerType})`}`)
  console.log(`By type:`)
  const counts = new Map<PageType, number>()
  for (const u of urls) counts.set(u.type, (counts.get(u.type) ?? 0) + 1)
  for (const [t, n] of counts) console.log(`  ${t.padEnd(10)} ${n}`)
  console.log('')

  if (isDryRun) {
    console.log('Sample URLs:')
    for (const u of urls.slice(0, 10)) console.log(`  - ${u.url}  [${u.type}]`)
    if (urls.length > 10) console.log(`  ... and ${urls.length - 10} more`)
    console.log('\nRe-run without --dry-run to make real GSC calls.')
    return
  }

  if (!process.env.GSC_OAUTH_CLIENT_PATH || !process.env.GSC_OAUTH_TOKEN_PATH) {
    console.error(
      '\n❌ GSC OAuth not set up.\n' +
        '   See docs/marketing/10-gsc-keyword-mining.md for the one-time setup.\n'
    )
    process.exit(1)
  }

  const progress = loadProgress()
  const todo = urls.filter((u) => !progress.processed_urls.includes(u.url))
  console.log(`Resuming: ${progress.processed_urls.length} done, ${todo.length} remaining\n`)

  let processed = 0
  let quotaHit = false

  try {
    await pMap(todo, CONCURRENCY, async (entry) => {
      if (quotaHit) return
      try {
        const inspection = await inspectOne(entry)
        progress.processed_urls.push(entry.url)
        if (inspection) progress.inspections.push(inspection)
        processed += 1
        if (processed % 25 === 0) {
          saveProgress(progress)
          console.log(`  · ${processed}/${todo.length} done`)
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'QUOTA_EXHAUSTED') {
          quotaHit = true
          console.warn(
            '\n⚠️  Daily quota reached (2,000 inspections/day). ' +
              'Checkpoint saved — re-run tomorrow to continue.\n'
          )
        } else {
          throw err
        }
      }
    })
  } finally {
    saveProgress(progress)
  }

  const report = buildReport(progress.inspections)
  writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2))
  printSummary(report)

  // Phase 9 B4 (2026-05-28): mirror to Postgres so runtime code can read
  // indexation state without parsing the JSON file. Best-effort: surface
  // the error to console but don't fail the whole run — the JSON is the
  // source of truth, the table is a cache.
  try {
    console.log(`Persisting ${progress.inspections.length} inspections to gsc_url_inspections…`)
    await persistInspections(progress.inspections)
    console.log('✓ Persisted.\n')
  } catch (err) {
    console.warn(
      `⚠️  Persistence to gsc_url_inspections failed: ${err instanceof Error ? err.message : String(err)}`,
    )
    console.warn('   JSON report is still on disk. Re-run with --ingest-only to retry.\n')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
