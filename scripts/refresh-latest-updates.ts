/**
 * Phase 8.next Stage 4 / Tier 2 (2026-05-13): "Latest from {Tool}" orchestrator.
 *
 * Per tool, fetches signal from 5 sources (changelog, blog, news, HN,
 * Twitter), feeds combined input to DeepSeek synthesis, atomic-writes
 * latest_updates JSONB + latest_updates_at timestamp.
 *
 * Mirrors Phase 4 SOP architecture: checkpoint + resume, single
 * corrective retry, 5-way concurrency.
 *
 * Phase 9 (2026-05-31) — WHOLE-CATALOG FRESHNESS + CHANGE-DETECTOR:
 *   The old top-50-by-view_count cap meant a rank-200 tool's launch was
 *   never captured. Now we process the catalog STALEST-FIRST by
 *   latest_updates_at (NULLs first) and size the daily cohort so the
 *   whole catalog (~2,000, cap 2,500) is CHECKED within 7 days (~360/day).
 *
 *   To keep cost bounded, every tool first runs through a CHEAP
 *   change-detector: we fetch the top change signals and hash them into a
 *   fingerprint (tools.latest_updates_fingerprint). If the fingerprint is
 *   unchanged, we SKIP DeepSeek and just bump latest_updates_at (the tool
 *   WAS checked, so it rotates to the back of the 7-day queue). DeepSeek
 *   synthesis runs only when the fingerprint changed, is missing, or
 *   latest_updates is NULL — so LLM cost is paid only for tools that
 *   actually moved.
 *
 * USAGE:
 *   npm run latest:dry                       # list what would be checked, no API calls
 *   npm run latest:apply                     # nightly run — 360 stalest tools
 *   npm run latest:apply -- --slug=chatgpt   # one tool — smoke-test
 *   npm run latest:apply -- --limit=20       # cap cohort for testing
 *   npm run latest:apply -- --daily=500      # override daily cohort size
 *   npm run latest:apply -- --force          # ignore fingerprint, always synthesize
 *   (env override: DAILY_LIMIT=500 npm run latest:apply)
 *
 * REQUIRED ENV (in .env.local):
 *   DEEPSEEK_API_KEY
 *   APIFY_TOKEN
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * COST: cheap path (unchanged tool) = free signal fetches only. Only
 * changed tools pay ~$0.024/tool (DeepSeek + Apify). With ~360 tools/day
 * checked and a low change rate, expected LLM spend is a fraction of the
 * old full-catalog cost.
 */
export {}

import { createHash } from 'node:crypto'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { discoverChangelog, discoverBlog } from '../lib/cron/scrape-changelog'
import { fetchNewsMentions } from '../lib/cron/scrape-news'
import { searchHN } from '../lib/cron/scrape-hn'
import { searchReddit } from '../lib/cron/scrape-reddit'
import { synthesizeLatestUpdates, type SignalInput } from '../lib/cron/latest-updates'
import { runScriptedPipeline } from '../lib/pipelines/with-logging'

const PROGRESS_FILE = join(process.cwd(), 'scripts', '.latest-updates-progress.json')
const REVIEW_LOG = join(process.cwd(), 'docs', 'preflight', 'latest-updates-needs-review.txt')
const CONCURRENCY = 5

// 7-day freshness SLA: at the 2,500-tool catalog cap, 2500/360 ≈ 6.9d full
// cycle (<7d with margin). Whole catalog is CHECKED — only changed tools
// pay the LLM cost. Override via DAILY_LIMIT env or --daily= flag.
const DEFAULT_DAILY_LIMIT = 360

type Tool = {
  id: string
  slug: string
  name: string
  website_url: string | null
  view_count: number | null
  changelog_url: string | null
  blog_url: string | null
  twitter_handle: string | null
  latest_updates_fingerprint: string | null
  latest_updates_at: string | null
  has_latest_updates: boolean
}

type Progress = {
  // UTC date the progress file was opened. Used to scope crash-resume to a
  // single nightly run — a new day starts fresh (the DB's latest_updates_at
  // ordering is the real cross-run queue now, not this file).
  day: string
  processed: string[]
  failed: Array<{ slug: string; error: string }>
}

const args = process.argv.slice(2)
const isDry = args.includes('--dry-run')
const isApply = args.includes('--apply')
const isForce = args.includes('--force')
const slugArg = args.find((a) => a.startsWith('--slug='))
const limitArg = args.find((a) => a.startsWith('--limit='))
const dailyArg = args.find((a) => a.startsWith('--daily='))
const targetSlug = slugArg?.split('=')[1]
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined

// Resolve the daily cohort size: --daily= flag > DAILY_LIMIT env > default.
// Guard against NaN/<=0 (e.g. a blank DAILY_LIMIT="" from the GH dispatch
// input on scheduled runs) by falling back to the default.
function resolveDailyLimit(): number {
  const raw = dailyArg ? dailyArg.split('=')[1] : process.env.DAILY_LIMIT
  const n = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT
}
const dailyLimit = resolveDailyLimit()

if (!isDry && !isApply) {
  console.error('Pass --dry-run or --apply')
  process.exit(1)
}
if (isApply) {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('DEEPSEEK_API_KEY missing from .env.local')
    process.exit(1)
  }
  if (!process.env.APIFY_TOKEN) {
    console.warn('APIFY_TOKEN missing — news + Reddit + Twitter sources will be skipped (changelog + blog + HN still work)')
  }
}

type ToolRow = Omit<Tool, 'has_latest_updates'> & { latest_updates: unknown }

async function fetchTools(): Promise<Tool[]> {
  const supa = getAdminClient()
  const all: Tool[] = []
  const PAGE = 1000
  // Stalest-first: NULL latest_updates_at (never checked) first, then
  // oldest checked. This is the 7-day rotation order — the front of the
  // queue is whatever has waited longest since its last check.
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from('tools')
      .select(
        'id, slug, name, website_url, view_count, changelog_url, blog_url, twitter_handle, latest_updates_fingerprint, latest_updates_at, latest_updates'
      )
      .eq('is_published', true)
      .order('latest_updates_at', { ascending: true, nullsFirst: true })
      // Stable tie-break so pagination is deterministic when many rows
      // share the same latest_updates_at (e.g. all-NULL on first run).
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as ToolRow[]
    for (const r of rows) {
      const { latest_updates, ...rest } = r
      all.push({
        ...rest,
        // Treat an empty array / null as "no synthesis yet" so the cheap
        // path still forces a first synthesis (NULL latest_updates branch).
        has_latest_updates: Array.isArray(latest_updates) && latest_updates.length > 0,
      })
    }
    if (rows.length < PAGE) break
  }
  return all
}

function loadProgress(): Progress {
  const today = new Date().toISOString().slice(0, 10)
  if (!existsSync(PROGRESS_FILE)) return { day: today, processed: [], failed: [] }
  try {
    const p = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) as Partial<Progress>
    // Stale file from a previous day → start fresh so we don't skip tools
    // that the DB now ranks as stalest. Same-day re-run resumes mid-batch.
    if (p.day !== today) return { day: today, processed: [], failed: [] }
    return { day: today, processed: p.processed ?? [], failed: p.failed ?? [] }
  } catch {
    return { day: today, processed: [], failed: [] }
  }
}
function saveProgress(p: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2))
}

async function pMap<T, R>(items: T[], concurrency: number, fn: (it: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (true) {
      const idx = i++
      if (idx >= items.length) return
      out[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return out
}

type ProcessOutcome =
  | { ok: true; action: 'synthesized' | 'skipped_unchanged' | 'skipped_no_signal' }
  | { ok: false; error: string }

/**
 * Cheap change-detector fingerprint. Hashes the top change-signal items
 * (changelog/blog first item + most-recent HN + most-recent Reddit) into
 * a stable digest. Two checks that surface the same top items produce the
 * same fingerprint → DeepSeek is skipped.
 *
 * We hash a small, stable slice (not the full scraped text) so cosmetic
 * page churn (footer dates, view counters) doesn't constantly bust the
 * cache, while a real new release/post DOES change the top item.
 */
function computeFingerprint(signal: SignalInput): string {
  const parts: string[] = []

  // Changelog/blog: first ~600 chars of the discovered text are where the
  // newest entry lives (these pages list newest-first). URL anchors it.
  if (signal.changelog_url) parts.push(`cl:${signal.changelog_url}`)
  if (signal.changelog_text) parts.push(`clt:${signal.changelog_text.slice(0, 600)}`)
  if (signal.blog_url) parts.push(`bl:${signal.blog_url}`)
  if (signal.blog_text) parts.push(`blt:${signal.blog_text.slice(0, 600)}`)

  // News / HN / Reddit: top 3 items by their identity (url + date/ts +
  // title). New launches push new items to the top → fingerprint changes.
  for (const n of (signal.news ?? []).slice(0, 3)) {
    parts.push(`nw:${n.url}|${n.date ?? ''}|${n.title}`)
  }
  for (const h of (signal.hn ?? []).slice(0, 3)) {
    parts.push(`hn:${h.hn_url}|${h.created_at}|${h.title}`)
  }
  for (const r of (signal.reddit ?? []).slice(0, 3)) {
    parts.push(`rd:${r.url}|${r.created_utc ?? ''}|${r.title}`)
  }

  return createHash('sha256').update(parts.join('\n')).digest('hex')
}

async function processOne(tool: Tool): Promise<ProcessOutcome> {
  const supa = getAdminClient()

  // ── Step 1: CHEAP signal fetch (no LLM). Same scrapers the synthesis
  // path uses — discover URLs + free news/HN/Reddit. Per-source failures
  // already degrade to null/[] inside the helpers AND are .catch-guarded
  // here, so a flaky source never aborts the tool.
  const [changelog, blog] = await Promise.all([
    discoverChangelog(tool.website_url, tool.changelog_url).catch(() => null),
    discoverBlog(tool.website_url, tool.blog_url).catch(() => null),
  ])
  const [news, hn, reddit] = await Promise.all([
    fetchNewsMentions(tool.name, 8).catch(() => []),
    searchHN(tool.name, 30).catch(() => []),
    searchReddit(tool.name, 5, 30).catch(() => []),
  ])

  // Build the signal payload (no twitter — dropped in the 2026-05-13 refactor).
  const signal: SignalInput = {
    changelog_text: changelog?.text,
    changelog_url: changelog?.url,
    blog_text: blog?.text,
    blog_url: blog?.url,
    news,
    hn,
    reddit: reddit.map((r) => ({
      title: r.title,
      url: r.permalink,
      subreddit: r.subreddit,
      score: r.score,
      created_utc: r.created_utc,
    })),
  }

  const hasSignal =
    !!signal.changelog_text ||
    !!signal.blog_text ||
    (signal.news?.length ?? 0) > 0 ||
    (signal.hn?.length ?? 0) > 0 ||
    (signal.reddit?.length ?? 0) > 0

  const fingerprint = computeFingerprint(signal)

  // ── Step 2: CHANGE-DETECTOR. Synthesize ONLY when something changed:
  //   - --force flag, or
  //   - tool has never been synthesized (latest_updates NULL/empty), or
  //   - no stored fingerprint yet (column just added / first pass), or
  //   - fingerprint differs from the stored one.
  // Otherwise SKIP DeepSeek and just bump latest_updates_at so the tool
  // rotates to the back of the 7-day queue — it WAS checked, cheaply.
  const changed =
    isForce ||
    !tool.has_latest_updates ||
    !tool.latest_updates_fingerprint ||
    tool.latest_updates_fingerprint !== fingerprint

  if (!changed) {
    // Unchanged. No LLM cost. Mark as checked + (re)store the fingerprint
    // so a fully-degraded fetch later doesn't masquerade as "changed".
    const { error } = await supa
      .from('tools')
      .update({
        latest_updates_at: new Date().toISOString(),
        latest_updates_fingerprint: fingerprint,
      } as never)
      .eq('id', tool.id)
    if (error) return { ok: false, error: `db_update_unchanged: ${error.message}` }
    return { ok: true, action: 'skipped_unchanged' }
  }

  // If there's genuinely no signal at all, there's nothing to synthesize.
  // Do NOT wipe an existing latest_updates — just mark checked + store the
  // (empty-signal) fingerprint so we don't re-trigger every night.
  if (!hasSignal) {
    const checkUpdates: Record<string, unknown> = {
      latest_updates_at: new Date().toISOString(),
      latest_updates_fingerprint: fingerprint,
    }
    // First-ever synthesis attempt with no signal → seed an empty array so
    // has_latest_updates becomes true and we stop forcing synthesis.
    if (!tool.has_latest_updates) checkUpdates.latest_updates = []
    const { error } = await supa.from('tools').update(checkUpdates as never).eq('id', tool.id)
    if (error) return { ok: false, error: `db_update_no_signal: ${error.message}` }
    return { ok: true, action: 'skipped_no_signal' }
  }

  // ── Step 3: EXPENSIVE path — DeepSeek synthesis (unchanged logic).
  const result = await synthesizeLatestUpdates(tool.name, signal)
  if (!result) {
    // Synthesis failed after retries: do NOT wipe latest_updates and do NOT
    // advance latest_updates_at (so the tool stays at the front of the queue
    // and is retried tomorrow). Surface as a failure for the review log.
    return { ok: false, error: 'synthesis_failed_after_retries' }
  }

  // ── Step 4: atomic write — content + fingerprint + checked-at together.
  const updates: Record<string, unknown> = {
    latest_updates: result.items,
    latest_updates_at: new Date().toISOString(),
    latest_updates_fingerprint: fingerprint,
  }
  if (changelog?.url && changelog.url !== tool.changelog_url) updates.changelog_url = changelog.url
  if (blog?.url && blog.url !== tool.blog_url) updates.blog_url = blog.url

  const { error } = await supa.from('tools').update(updates as never).eq('id', tool.id)
  if (error) return { ok: false, error: `db_update: ${error.message}` }

  return { ok: true, action: 'synthesized' }
}

async function main() {
  // fetchTools() returns the WHOLE published catalog stalest-first
  // (NULL latest_updates_at, then oldest checked). The nightly cohort is
  // the front DAILY_LIMIT slice — that's the 7-day rotation queue.
  const all = await fetchTools()
  let cohort = all
  if (targetSlug) {
    cohort = all.filter((t) => t.slug === targetSlug)
  } else {
    // Stalest-first cohort sized for the 7-day SLA (no more top-50 cap).
    cohort = all.slice(0, dailyLimit)
  }
  if (limit) cohort = cohort.slice(0, limit)

  const cycleDays = dailyLimit > 0 ? (all.length / dailyLimit).toFixed(1) : 'n/a'
  console.log(`Tools loaded:    ${all.length} (whole published catalog)`)
  console.log(`Daily limit:     ${dailyLimit}`)
  console.log(`Cohort:          ${cohort.length} (stalest-first)`)
  console.log(`Full-cycle:      ~${cycleDays} days to check every tool`)
  console.log(`Mode:            ${isDry ? 'DRY-RUN' : 'APPLY'}${isForce ? ' (FORCE)' : ''}`)
  console.log(`Concurrency:     ${CONCURRENCY}`)
  console.log('')

  if (isDry) {
    const needsSynthesis = cohort.filter(
      (t) => isForce || !t.has_latest_updates || !t.latest_updates_fingerprint
    ).length
    console.log(`Stalest tools that would be CHECKED (first 10):`)
    for (const t of cohort.slice(0, 10)) {
      const last = t.latest_updates_at ? t.latest_updates_at.slice(0, 10) : 'never'
      const fp = t.latest_updates_fingerprint ? 'fp' : 'no-fp'
      console.log(`  · ${t.name.padEnd(32)} (${t.slug})  last=${last} ${fp}`)
    }
    console.log('')
    console.log(
      `At least ${needsSynthesis}/${cohort.length} will run DeepSeek (no fingerprint / no latest_updates yet).`
    )
    console.log(
      `The rest only synthesize if their change-signal fingerprint differs from the stored one.`
    )
    console.log(`Re-run with --apply.`)
    return
  }

  // Phase 11 B5 — log the nightly news-refresh GH run to pipeline_runs. This
  // pipeline FEEDS the latest_updates that B1's editorial refresh now depends on;
  // if it silently stalls, freshness degrades catalog-wide — so it must be visible.
  await runScriptedPipeline(
    { source: 'gh_actions', pipelineKey: 'refresh-latest-updates' },
    async (ctx) => {
  const progress = loadProgress()
  const todo = cohort.filter((t) => !progress.processed.includes(t.slug))
  console.log(`Resuming (day ${progress.day}): ${progress.processed.length} done, ${todo.length} remaining\n`)

  let done = 0
  const tally = { synthesized: 0, skipped_unchanged: 0, skipped_no_signal: 0 }
  await pMap(todo, CONCURRENCY, async (tool) => {
    const t0 = Date.now()
    // Per-tool isolation: any throw inside processOne is caught here and
    // recorded as a failure — the batch continues with the next tool.
    const result = await processOne(tool).catch((err) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : String(err),
    }))
    const ms = Date.now() - t0
    if (result.ok) {
      tally[result.action]++
      progress.processed.push(tool.slug)
      const mark =
        result.action === 'synthesized' ? '✓ synth' : result.action === 'skipped_unchanged' ? '· same' : '· no-signal'
      console.log(`[${++done}/${todo.length}] ${tool.slug} ${mark} (${ms}ms)`)
    } else {
      progress.failed.push({ slug: tool.slug, error: result.error })
      console.error(`[${++done}/${todo.length}] ${tool.slug} ✗ ${result.error}`)
    }
    if (done % 25 === 0) saveProgress(progress)
  })
  saveProgress(progress)

  // Failure log for manual review
  if (progress.failed.length > 0) {
    const lines = progress.failed
      .map((f) => `${new Date().toISOString()} ${f.slug}: ${f.error}`)
      .join('\n')
    try {
      writeFileSync(REVIEW_LOG, lines + '\n', { flag: 'a' })
    } catch {
      /* ignore */
    }
  }

  console.log('')
  console.log(`✓ Complete.`)
  console.log(`  Checked:           ${progress.processed.length}`)
  console.log(`  Synthesized (LLM): ${tally.synthesized}`)
  console.log(`  Skipped unchanged: ${tally.skipped_unchanged}`)
  console.log(`  Skipped no-signal: ${tally.skipped_no_signal}`)
  console.log(`  Failed:            ${progress.failed.length}`)
  if (progress.failed.length > 0) {
    console.log('')
    console.log('Sample failures:')
    for (const f of progress.failed.slice(0, 5)) {
      console.log(`  · ${f.slug}: ${f.error.slice(0, 120)}`)
    }
  }

      ctx.recordItems({
        processed: progress.processed.length + progress.failed.length,
        succeeded: progress.processed.length,
        failed: progress.failed.length,
      })
      ctx.recordMetadata({
        cohort: cohort.length,
        synthesized: tally.synthesized,
        skipped_unchanged: tally.skipped_unchanged,
        skipped_no_signal: tally.skipped_no_signal,
      })
      // Partial when some tools failed but others succeeded — a non-fatal
      // degradation that should be visible without paging as a hard failure.
      if (progress.failed.length > 0 && progress.processed.length > 0) ctx.setStatus('partial')
    },
  )
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
