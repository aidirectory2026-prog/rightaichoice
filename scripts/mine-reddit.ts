/**
 * Phase 7A.fallback — Reddit keyword mining via Apify.
 *
 * Uses the iskander/fast-reddit-scraper actor (no Reddit OAuth needed).
 * Batches all search terms into a single actor run for efficiency.
 *
 * For each tool in the top-N-by-view-count cohort, fires 2 query
 * patterns at Reddit search:
 *   - "{tool} alternative"  (alternative bucket)
 *   - "{tool} vs"           (compare bucket)
 *
 * USAGE:
 *   npm run mine:reddit:dry
 *   npm run mine:reddit:apply
 *   npm run mine:reddit:apply -- --top=300
 *   npm run mine:reddit:apply -- --slug=kit
 *
 * COST: ~$0.0004/result × 5 results × 2 patterns × 300 tools ≈ $1.20.
 *
 * OUTPUT: scripts/.reddit-opportunities.json
 */
export {}

import { writeFileSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { runActorAndCollect } from '../lib/seo/apify-client'

const OUTPUT_FILE = join(process.cwd(), 'scripts', '.reddit-opportunities.json')
const ACTOR_ID = 'iskander/fast-reddit-scraper'
const DEFAULT_TOP = 300
const RESULTS_PER_QUERY = 5

type PageType = 'compare' | 'alternative' | 'worth-it' | 'how-to' | 'use-case' | 'pricing' | 'unbucketed'

type RedditPost = {
  title?: string
  url?: string
  permalink?: string
  subreddit?: string
  subreddit_name_prefixed?: string
  score?: number
  num_comments?: number
  author?: string
  selftext?: string
  // The actor varies field names slightly across versions; we read
  // permissively below.
  [k: string]: unknown
}

type Opportunity = {
  tool_slug: string
  page_type: PageType
  target_keyword: string
  source: 'reddit'
  search_query: string
  post_title: string
  reddit_url: string
  subreddit: string | null
  reddit_score: number
  reddit_comments: number
  // Score = upvotes + 2 × comments (engagement-weighted; comments
  // signal active discussion more than passive upvotes).
  est_volume_score: number
}

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isApply = args.includes('--apply')
const topArg = args.find((a) => a.startsWith('--top='))
const slugArg = args.find((a) => a.startsWith('--slug='))
const top = topArg ? parseInt(topArg.split('=')[1], 10) : DEFAULT_TOP
const targetSlug = slugArg ? slugArg.split('=')[1] : undefined

if (!isDryRun && !isApply) {
  console.error('Pass --dry-run or --apply')
  process.exit(1)
}

// ── Fetch top-N tools by view_count ─────────────────────────────────────────

async function fetchTopTools(): Promise<Array<{ slug: string; name: string }>> {
  const supa = getAdminClient()
  const { data, error } = await supa
    .from('tools')
    .select('slug, name')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .range(0, top - 1)
  if (error) throw error
  return ((data ?? []) as Array<{ slug: string; name: string }>)
}

// ── Build search-term batch ─────────────────────────────────────────────────

type SearchEntry = { tool_slug: string; name: string; query: string; bucket: PageType }

function buildBatch(tools: Array<{ slug: string; name: string }>): SearchEntry[] {
  const entries: SearchEntry[] = []
  for (const t of tools) {
    entries.push({ tool_slug: t.slug, name: t.name, query: `${t.name} alternative`, bucket: 'alternative' })
    entries.push({ tool_slug: t.slug, name: t.name, query: `${t.name} vs`, bucket: 'compare' })
  }
  return entries
}

// ── Map actor results back to opportunities ────────────────────────────────
// The actor returns a flat array of posts. We don't know which search
// term each post came from unless the actor preserves it — which this
// one does NOT consistently. Workaround: we associate posts to tools
// by checking which tool name appears in the post title.

function looseMatch(title: string, name: string): boolean {
  const t = title.toLowerCase()
  const n = name.toLowerCase()
  return t.includes(n)
}

function bucketFromTitle(title: string, fallback: PageType): PageType {
  const q = title.toLowerCase()
  if (/\b(vs\.?|versus|compared\s+to|comparison)\b/i.test(q)) return 'compare'
  if (/\b(alternative|alternatives|instead\s+of|replace)\b/i.test(q)) return 'alternative'
  if (/\b(worth\s+it|legit|scam|review|reviews|good)\b/i.test(q)) return 'worth-it'
  if (/\b(how\s+to|tutorial|guide|setup)\b/i.test(q)) return 'how-to'
  if (/\b(pricing|cost|free\s+tier|subscription)\b/i.test(q)) return 'pricing'
  if (/\b(best|top|for\s+\w+)\b/i.test(q)) return 'use-case'
  return fallback
}

async function main() {
  const tools = targetSlug
    ? (await fetchTopTools()).filter((t) => t.slug === targetSlug)
    : await fetchTopTools()
  const batch = buildBatch(tools)

  console.log(`Source:       Reddit (via Apify ${ACTOR_ID})`)
  console.log(`Tools:        ${tools.length}`)
  console.log(`Batch size:   ${batch.length} search queries`)
  console.log(`Per query:    up to ${RESULTS_PER_QUERY} results`)
  console.log(`Mode:         ${isDryRun ? 'DRY-RUN' : 'APPLY'}`)
  console.log('')

  if (isDryRun) {
    console.log('Sample search terms (first 6):')
    for (const e of batch.slice(0, 6)) console.log(`  - "${e.query}" → ${e.bucket} (${e.tool_slug})`)
    console.log('')
    console.log(`Re-run with --apply to spend ~$${(0.0004 * RESULTS_PER_QUERY * batch.length).toFixed(2)} of Apify credit.`)
    return
  }

  if (!process.env.APIFY_TOKEN) {
    console.error('\n❌ APIFY_TOKEN not set in .env.local\n')
    process.exit(1)
  }

  console.log(`Starting Apify actor run with ${batch.length} search terms...`)
  const t0 = Date.now()
  const posts = await runActorAndCollect<RedditPost>(ACTOR_ID, {
    search_terms: batch.map((e) => e.query),
    sort: 'relevance',
    t: 'year',
  })
  console.log(`Actor returned ${posts.length} posts in ${Math.round((Date.now() - t0) / 1000)}s\n`)

  // Group queries by tool name for fast title-match lookup
  const toolByName = new Map<string, { slug: string; name: string }>()
  for (const t of tools) toolByName.set(t.name.toLowerCase(), { slug: t.slug, name: t.name })

  const opps: Opportunity[] = []
  for (const post of posts) {
    const title = String(post.title ?? '').trim()
    if (!title) continue
    // Match any tool name that appears in the title
    let matched: { slug: string; name: string } | null = null
    for (const [key, t] of toolByName) {
      if (key.length >= 3 && title.toLowerCase().includes(key)) {
        matched = t
        break
      }
    }
    if (!matched) continue
    const fallback: PageType = /\bvs\b/i.test(title) ? 'compare' : 'alternative'
    const bucket = bucketFromTitle(title, fallback)
    const subreddit =
      typeof post.subreddit === 'string'
        ? post.subreddit
        : typeof post.subreddit_name_prefixed === 'string'
          ? post.subreddit_name_prefixed.replace(/^r\//, '')
          : null
    const score = Number(post.score ?? 0) || 0
    const comments = Number(post.num_comments ?? 0) || 0
    const url =
      typeof post.url === 'string'
        ? post.url
        : typeof post.permalink === 'string'
          ? `https://www.reddit.com${post.permalink}`
          : ''
    opps.push({
      tool_slug: matched.slug,
      page_type: bucket,
      target_keyword: title.slice(0, 200),
      source: 'reddit',
      search_query: '', // batch lost; could rebuild via title matching but not worth complexity
      post_title: title,
      reddit_url: url,
      subreddit,
      reddit_score: score,
      reddit_comments: comments,
      est_volume_score: score + 2 * comments,
    })
  }

  opps.sort((a, b) => b.est_volume_score - a.est_volume_score)
  const totals: Record<PageType, number> = {
    compare: 0,
    alternative: 0,
    'worth-it': 0,
    'how-to': 0,
    'use-case': 0,
    pricing: 0,
    unbucketed: 0,
  }
  for (const o of opps) totals[o.page_type] += 1

  writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: 'reddit',
        actor: ACTOR_ID,
        tools_in_scope: tools.length,
        total_opportunities: opps.length,
        bucket_totals: totals,
        opportunities: opps,
      },
      null,
      2
    )
  )
  console.log(`✓ Wrote ${opps.length} opportunities to ${OUTPUT_FILE}`)
  console.log(`  Bucket totals:`, totals)
  console.log('')
  console.log(`Top 10 by est_volume_score:`)
  for (const o of opps.slice(0, 10)) {
    console.log(
      `  · ${o.tool_slug.padEnd(20)} | ${o.page_type.padEnd(11)} | r/${(o.subreddit ?? '?').padEnd(15)} | ↑${String(o.reddit_score).padStart(4)} 💬${String(o.reddit_comments).padStart(3)} | "${o.post_title.slice(0, 70)}"`
    )
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
