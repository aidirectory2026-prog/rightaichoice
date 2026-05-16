/**
 * Phase 7N (2026-05-16) — Bing Webmaster direct URL submission.
 *
 * Complements IndexNow (which also notifies Bing). Direct submission
 * via the Bing Webmaster API can be a stronger crawl signal for
 * brand-new content because it goes through Bing's authenticated
 * intake rather than the generic IndexNow firehose.
 *
 * USAGE:
 *   npm run bing:submit:dry          # list URLs that would be submitted
 *   npm run bing:submit              # submit /compare URLs
 *   npm run bing:submit -- --tools   # submit /tools URLs
 *   npm run bing:submit -- --all     # everything
 *
 * REQUIRED ENV:
 *   BING_WEBMASTER_API_KEY (get from https://www.bing.com/webmasters →
 *     Settings → API Access → Generate Key)
 *
 * QUOTAS: 500 URLs/site/day. Script chunks into 500-URL batches and
 * fails fast if the daily quota is exceeded. The Bing SubmitUrlbatch
 * endpoint caps individual requests at 500 URLs.
 */
export {}

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'

// ── Checkpoint state (for --smart auto-rotation) ───────────────────
// Saved in scripts/.bing-submit-checkpoint.json. Tracks where the
// rotation is so consecutive daily runs cycle through every URL
// type without overlap — the operator literally just runs the
// command once a day, no flags.
const CHECKPOINT_FILE = join(process.cwd(), 'scripts', '.bing-submit-checkpoint.json')

type ContentType = 'compare' | 'tool' | 'alternative' | 'category'
const ROTATION: ContentType[] = ['compare', 'tool', 'alternative', 'category']

type Checkpoint = {
  /** Where the current rotation cursor is */
  type: ContentType
  /** How many URLs of this type have been submitted in the current pass */
  offset: number
  /** Wall-clock of last successful run (helps detect "already ran today") */
  lastRunUtc: string
  /** Cumulative URLs ever submitted (lifetime stat) */
  lifetimeSubmitted: number
}

function loadCheckpoint(): Checkpoint {
  if (!existsSync(CHECKPOINT_FILE)) {
    return { type: 'compare', offset: 0, lastRunUtc: '', lifetimeSubmitted: 0 }
  }
  try {
    return JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8')) as Checkpoint
  } catch {
    return { type: 'compare', offset: 0, lastRunUtc: '', lifetimeSubmitted: 0 }
  }
}

function saveCheckpoint(cp: Checkpoint) {
  const dir = join(process.cwd(), 'scripts')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2))
}

function nextType(current: ContentType): ContentType {
  const i = ROTATION.indexOf(current)
  return ROTATION[(i + 1) % ROTATION.length]
}

const SITE_URL = 'https://rightaichoice.com'
const BING_ENDPOINT = 'https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch'
const BING_QUOTA_ENDPOINT = 'https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota'
const PER_REQUEST_CAP = 500
// Documented default is 500/day but real per-account limits are much
// lower (new accounts: 10/day; verified: ~100/day; aged: higher). The
// script probes GetUrlSubmissionQuota at runtime and respects what
// Bing actually grants this account today.

type Args = {
  dry: boolean
  smart: boolean
  includeTools: boolean
  includeCategories: boolean
  includeBest: boolean
  includeAlternatives: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  const all = argv.includes('--all')
  return {
    dry: argv.includes('--dry'),
    smart: argv.includes('--smart'),
    includeTools: all || argv.includes('--tools'),
    includeCategories: all || argv.includes('--categories'),
    includeBest: all || argv.includes('--best'),
    includeAlternatives: all || argv.includes('--alternatives'),
  }
}

// ── Per-type URL builders (smart mode picks one type per day) ──────

async function gatherCompareUrls(): Promise<string[]> {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('tool_comparisons')
    .select('slug')
    .eq('is_editorial', true)
  return ((data as { slug: string }[]) ?? []).map((c) => `${SITE_URL}/compare/${c.slug}`)
}

async function gatherToolUrls(): Promise<string[]> {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('tools')
    .select('slug')
    .eq('is_published', true)
  return ((data as { slug: string }[]) ?? []).map((t) => `${SITE_URL}/tools/${t.slug}`)
}

async function gatherAlternativeUrls(): Promise<string[]> {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('tools')
    .select('slug')
    .eq('is_published', true)
  return ((data as { slug: string }[]) ?? []).map(
    (t) => `${SITE_URL}/tools/${t.slug}/alternatives`,
  )
}

async function gatherCategoryUrls(): Promise<string[]> {
  const supabase = getAdminClient()
  const { data } = await supabase.from('categories').select('slug')
  return ((data as { slug: string }[]) ?? []).map((c) => `${SITE_URL}/categories/${c.slug}`)
}

async function gatherByType(type: ContentType): Promise<string[]> {
  switch (type) {
    case 'compare':
      return gatherCompareUrls()
    case 'tool':
      return gatherToolUrls()
    case 'alternative':
      return gatherAlternativeUrls()
    case 'category':
      return gatherCategoryUrls()
  }
}

async function gatherUrls(args: Args): Promise<string[]> {
  const supabase = getAdminClient()
  const urls: string[] = []

  // Always include compare pages.
  const { data: comparisons } = await supabase
    .from('tool_comparisons')
    .select('slug')
    .eq('is_editorial', true)
  if (comparisons) {
    for (const c of comparisons as { slug: string }[]) {
      urls.push(`${SITE_URL}/compare/${c.slug}`)
    }
  }

  if (args.includeTools) {
    const { data: tools } = await supabase
      .from('tools')
      .select('slug')
      .eq('is_published', true)
    for (const t of (tools as { slug: string }[]) ?? []) {
      urls.push(`${SITE_URL}/tools/${t.slug}`)
    }
  }
  if (args.includeAlternatives) {
    const { data: tools } = await supabase
      .from('tools')
      .select('slug')
      .eq('is_published', true)
    for (const t of (tools as { slug: string }[]) ?? []) {
      urls.push(`${SITE_URL}/tools/${t.slug}/alternatives`)
    }
  }
  if (args.includeCategories) {
    const { data: cats } = await supabase.from('categories').select('slug')
    for (const c of (cats as { slug: string }[]) ?? []) {
      urls.push(`${SITE_URL}/categories/${c.slug}`)
    }
  }
  if (args.includeBest) {
    // BEST_PAGES is a const; not in DB. Skip for now — operator submits
    // /best/* via dashboard since it's a small constant set.
  }

  return urls
}

async function fetchDailyQuota(apiKey: string): Promise<number | null> {
  const url = `${BING_QUOTA_ENDPOINT}?siteUrl=${encodeURIComponent(SITE_URL)}&apikey=${encodeURIComponent(apiKey)}`
  try {
    const res = await fetch(url, { method: 'GET' })
    const json = (await res.json()) as { d?: { DailyQuota?: number } }
    return json.d?.DailyQuota ?? null
  } catch {
    return null
  }
}

async function submitChunk(apiKey: string, urls: string[]): Promise<void> {
  const url = `${BING_ENDPOINT}?apikey=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ siteUrl: SITE_URL, urlList: urls }),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Bing API ${res.status}: ${text.slice(0, 300)}`)
  }
  console.log(`  ✓ Submitted batch of ${urls.length}: HTTP ${res.status}`)
}

async function main() {
  const args = parseArgs()
  const apiKey = process.env.BING_WEBMASTER_API_KEY

  // ── Smart mode: checkpoint-driven rotation ────────────────────────
  if (args.smart) {
    const cp = loadCheckpoint()
    const today = new Date().toISOString().slice(0, 10)
    const lastRunDay = cp.lastRunUtc.slice(0, 10)

    if (lastRunDay === today && !args.dry) {
      console.log(`[bing] already ran today (${today}). Daily quota is per-UTC-day.`)
      console.log(`  Checkpoint: ${cp.type} · offset ${cp.offset} · lifetime ${cp.lifetimeSubmitted}`)
      return
    }

    // Probe quota up front so we know how many to slice off.
    if (!apiKey && !args.dry) {
      console.error('\n❌ BING_WEBMASTER_API_KEY missing.')
      process.exit(1)
    }
    // Dry runs use a notional cap (100) so the preview shows what
    // *would* go tomorrow when quota resets; live runs probe the
    // actual quota remaining today.
    const quota = args.dry ? 100 : apiKey ? await fetchDailyQuota(apiKey) : null
    const cap = quota ?? 100

    // Try the current rotation type first; if exhausted, advance.
    let { type, offset } = cp
    let pool = await gatherByType(type)
    let advanced = 0
    while (offset >= pool.length && advanced < ROTATION.length) {
      // Exhausted this type — advance + reset offset.
      type = nextType(type)
      offset = 0
      pool = await gatherByType(type)
      advanced++
    }
    if (pool.length === 0) {
      console.warn(`[bing] no URLs available for any rotation type. Skipping.`)
      return
    }

    const slice = pool.slice(offset, offset + cap)
    console.log(
      `[bing] smart mode → type=${type} offset=${offset} slice=${slice.length} (quota=${cap}, pool=${pool.length})`,
    )

    if (args.dry) {
      slice.slice(0, 20).forEach((u) => console.log(`  ${u}`))
      if (slice.length > 20) console.log(`  … and ${slice.length - 20} more`)
      return
    }

    const requestCap = Math.min(PER_REQUEST_CAP, cap)
    for (let i = 0; i < slice.length; i += requestCap) {
      await submitChunk(apiKey!, slice.slice(i, i + requestCap))
    }

    const newOffset = offset + slice.length
    const exhausted = newOffset >= pool.length
    saveCheckpoint({
      type: exhausted ? nextType(type) : type,
      offset: exhausted ? 0 : newOffset,
      lastRunUtc: new Date().toISOString(),
      lifetimeSubmitted: cp.lifetimeSubmitted + slice.length,
    })

    console.log(`\n✓ Submitted ${slice.length} ${type} URLs to Bing.`)
    if (exhausted) console.log(`  ${type} pool exhausted → tomorrow rotates to ${nextType(type)}.`)
    console.log(`  Lifetime submitted: ${cp.lifetimeSubmitted + slice.length}`)
    return
  }

  // ── Legacy explicit-flag mode (kept for ad-hoc pushes) ────────────
  const urls = await gatherUrls(args)

  console.log(`[bing] gathered ${urls.length} URLs`)

  if (args.dry) {
    console.log('Dry-run — first 20:')
    urls.slice(0, 20).forEach((u) => console.log(`  ${u}`))
    return
  }

  if (!apiKey) {
    console.error(
      '\n❌ BING_WEBMASTER_API_KEY missing. Get one at:',
      '\n   https://www.bing.com/webmasters → Settings → API Access',
    )
    process.exit(1)
  }

  const quota = await fetchDailyQuota(apiKey)
  if (quota === null) {
    console.warn(`[bing] could not probe daily quota — defaulting to 100`)
  }
  const cap = quota ?? 100

  if (urls.length > cap) {
    console.warn(
      `[bing] ${urls.length} URLs exceeds today's quota (${cap}). Submitting first ${cap} only.`,
    )
    urls.length = cap
  }

  const requestCap = Math.min(PER_REQUEST_CAP, cap)
  for (let i = 0; i < urls.length; i += requestCap) {
    const chunk = urls.slice(i, i + requestCap)
    await submitChunk(apiKey, chunk)
  }

  console.log(`\n✓ Submitted ${urls.length} URLs to Bing Webmaster.`)
  console.log(`  Verify at https://www.bing.com/webmasters → Submit URLs.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
