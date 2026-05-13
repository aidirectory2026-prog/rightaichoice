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
 * USAGE:
 *   npm run latest:dry                       # list what would be fetched, no API calls
 *   npm run latest:apply                     # full run (~$28, ~3 hr unattended)
 *   npm run latest:apply -- --slug=chatgpt   # one tool — smoke-test
 *   npm run latest:apply -- --limit=20       # cap for testing
 *   npm run latest:apply -- --top=100        # top N by view_count
 *
 * REQUIRED ENV (in .env.local):
 *   DEEPSEEK_API_KEY
 *   APIFY_TOKEN
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * COST: ~$0.024/tool (DeepSeek $0.01 + Apify News $0.004 + Apify Reddit
 * $0.002 + Apify Twitter $0.008). Full catalog of 1,178 ≈ $28 one-time.
 */
export {}

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { discoverChangelog, discoverBlog } from '../lib/cron/scrape-changelog'
import { fetchNewsMentions } from '../lib/cron/scrape-news'
import { searchHN } from '../lib/cron/scrape-hn'
import { searchReddit } from '../lib/cron/scrape-reddit'
import { synthesizeLatestUpdates, type SignalInput } from '../lib/cron/latest-updates'

const PROGRESS_FILE = join(process.cwd(), 'scripts', '.latest-updates-progress.json')
const REVIEW_LOG = join(process.cwd(), 'docs', 'preflight', 'latest-updates-needs-review.txt')
const CONCURRENCY = 5

type Tool = {
  id: string
  slug: string
  name: string
  website_url: string | null
  view_count: number | null
  changelog_url: string | null
  blog_url: string | null
  twitter_handle: string | null
}

type Progress = {
  processed: string[]
  failed: Array<{ slug: string; error: string }>
}

const args = process.argv.slice(2)
const isDry = args.includes('--dry-run')
const isApply = args.includes('--apply')
const slugArg = args.find((a) => a.startsWith('--slug='))
const limitArg = args.find((a) => a.startsWith('--limit='))
const topArg = args.find((a) => a.startsWith('--top='))
const targetSlug = slugArg?.split('=')[1]
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
const topN = topArg ? parseInt(topArg.split('=')[1], 10) : undefined

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

async function fetchTools(): Promise<Tool[]> {
  const supa = getAdminClient()
  const all: Tool[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from('tools')
      .select('id, slug, name, website_url, view_count, changelog_url, blog_url, twitter_handle')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as unknown as Tool[]
    all.push(...rows)
    if (rows.length < PAGE) break
  }
  return all
}

function loadProgress(): Progress {
  if (!existsSync(PROGRESS_FILE)) return { processed: [], failed: [] }
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
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

async function processOne(tool: Tool): Promise<{ ok: true } | { ok: false; error: string }> {
  const supa = getAdminClient()

  // Step 1: discover URLs (cached on first run, re-uses cache thereafter)
  const [changelog, blog] = await Promise.all([
    discoverChangelog(tool.website_url, tool.changelog_url).catch(() => null),
    discoverBlog(tool.website_url, tool.blog_url).catch(() => null),
  ])

  // Step 2: fetch news (RSS — free) + HN (Algolia — free) + Reddit
  // (free public JSON) in parallel. Twitter dropped per refactor —
  // free Apify-less alternative isn't reliable, vendor announcements
  // land on changelog within 24h anyway.
  const [news, hn, reddit] = await Promise.all([
    fetchNewsMentions(tool.name, 8).catch(() => []),
    searchHN(tool.name, 30).catch(() => []),
    searchReddit(tool.name, 5, 30).catch(() => []),
  ])

  // Step 3: build signal payload (no twitter)
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

  // Step 5: DeepSeek synthesis
  const result = await synthesizeLatestUpdates(tool.name, signal)
  if (!result) {
    return { ok: false, error: 'synthesis_failed_after_retries' }
  }

  // Step 6: atomic write
  const updates: Record<string, unknown> = {
    latest_updates: result.items,
    latest_updates_at: new Date().toISOString(),
  }
  if (changelog?.url && changelog.url !== tool.changelog_url) updates.changelog_url = changelog.url
  if (blog?.url && blog.url !== tool.blog_url) updates.blog_url = blog.url

  const { error } = await supa.from('tools').update(updates as never).eq('id', tool.id)
  if (error) return { ok: false, error: `db_update: ${error.message}` }

  return { ok: true }
}

async function main() {
  const all = await fetchTools()
  let cohort = all
  if (targetSlug) cohort = all.filter((t) => t.slug === targetSlug)
  if (topN) cohort = cohort.slice(0, topN)
  if (limit) cohort = cohort.slice(0, limit)

  console.log(`Tools loaded:    ${all.length}`)
  console.log(`Cohort:          ${cohort.length}`)
  console.log(`Mode:            ${isDry ? 'DRY-RUN' : 'APPLY'}`)
  console.log(`Concurrency:     ${CONCURRENCY}`)
  console.log('')

  if (isDry) {
    console.log(`Sample tools that would be processed (first 10):`)
    for (const t of cohort.slice(0, 10)) {
      console.log(`  · ${t.name.padEnd(32)} (${t.slug})`)
    }
    const totalCost = (cohort.length * 0.024).toFixed(2)
    console.log('')
    console.log(`Re-run with --apply to spend ~$${totalCost} (DeepSeek + Apify News + Apify Reddit + Apify Twitter).`)
    return
  }

  const progress = loadProgress()
  const todo = cohort.filter((t) => !progress.processed.includes(t.slug))
  console.log(`Resuming: ${progress.processed.length} done, ${todo.length} remaining\n`)

  let done = 0
  await pMap(todo, CONCURRENCY, async (tool) => {
    const t0 = Date.now()
    const result = await processOne(tool).catch((err) => ({
      ok: false as const,
      error: err instanceof Error ? err.message : String(err),
    }))
    const ms = Date.now() - t0
    if (result.ok) {
      progress.processed.push(tool.slug)
      console.log(`[${++done}/${todo.length}] ${tool.slug} ✓ (${ms}ms)`)
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
  console.log(`  Processed: ${progress.processed.length}`)
  console.log(`  Failed:    ${progress.failed.length}`)
  if (progress.failed.length > 0) {
    console.log('')
    console.log('Sample failures:')
    for (const f of progress.failed.slice(0, 5)) {
      console.log(`  · ${f.slug}: ${f.error.slice(0, 120)}`)
    }
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
