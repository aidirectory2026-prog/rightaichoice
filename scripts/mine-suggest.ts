/**
 * Phase 7A.fallback — Google Suggest keyword mining.
 *
 * For every published tool, fires 7 seed query patterns at the public
 * Google Suggest endpoint. Each seed returns up to 10 autocomplete
 * suggestions — these are literally what Google's index says are the
 * most-searched continuations for that prefix. Bucketed into the same
 * intent buckets as GSC mining.
 *
 * USAGE:
 *   npm run mine:suggest:dry
 *   npm run mine:suggest:apply
 *   npm run mine:suggest:apply -- --limit=20
 *   npm run mine:suggest:apply -- --slug=kit
 *
 * COST: free. ~14 min for 1,178 tools at 10 req/sec.
 *
 * OUTPUT: scripts/.suggest-opportunities.json — same shape as
 *         .gsc-opportunities.json so merge-opportunities.ts can
 *         union them easily.
 */
export {}

import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { getSuggestionsThrottled } from '../lib/seo/suggest-client'

const PROGRESS_FILE = join(process.cwd(), 'scripts', '.suggest-mining-progress.json')
const OUTPUT_FILE = join(process.cwd(), 'scripts', '.suggest-opportunities.json')

type PageType =
  | 'compare'
  | 'alternative'
  | 'worth-it'
  | 'how-to'
  | 'use-case'
  | 'pricing'
  | 'unbucketed'

type Opportunity = {
  tool_slug: string
  page_type: PageType
  target_keyword: string
  source: 'google-suggest'
  seed_query: string
  suggestion_rank: number
  // Volume score = (1 / rank) * 10 — earlier rank = higher signal.
  est_volume_score: number
}

type Progress = { processed: string[]; opportunities: Opportunity[] }

// Seed query patterns. Each one biases Google's autocomplete toward a
// specific intent bucket — e.g. "X vs" autocompletes only competitor
// names; "is X" autocompletes worth-it / opinion phrases.
const SEED_PATTERNS: Array<{ template: (name: string) => string; bias: PageType }> = [
  { template: (n) => n, bias: 'unbucketed' }, // bare tool name — captures whatever's hot
  { template: (n) => `${n} vs`, bias: 'compare' },
  { template: (n) => `${n} alternative`, bias: 'alternative' },
  { template: (n) => `${n} for`, bias: 'use-case' },
  { template: (n) => `is ${n}`, bias: 'worth-it' },
  { template: (n) => `how to use ${n}`, bias: 'how-to' },
  { template: (n) => `${n} pricing`, bias: 'pricing' },
]

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isApply = args.includes('--apply')
const limitArg = args.find((a) => a.startsWith('--limit='))
const slugArg = args.find((a) => a.startsWith('--slug='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
const targetSlug = slugArg ? slugArg.split('=')[1] : undefined

if (!isDryRun && !isApply) {
  console.error('Pass --dry-run or --apply')
  process.exit(1)
}

// ── Intent bucketing ────────────────────────────────────────────────────────

function bucketBySuggestion(suggestion: string, seedBias: PageType): PageType {
  const q = suggestion.toLowerCase()
  // Compare wins over everything else when "vs/versus" present
  if (/\b(vs\.?|versus|compared\s+to|comparison)\b/i.test(q)) return 'compare'
  if (/\b(alternative|alternatives|instead\s+of|replace|replacement\s+for)\b/i.test(q))
    return 'alternative'
  if (/\b(worth\s+it|worth\s+the|legit|scam|reliable|trustworthy|review|reviews|good)\b/i.test(q))
    return 'worth-it'
  if (/\b(how\s+to|tutorial|guide|setup|set\s+up|getting\s+started|integrate)\b/i.test(q))
    return 'how-to'
  if (/\b(pricing|cost|free\s+tier|subscription|plans?|cheap|affordable|expensive)\b/i.test(q))
    return 'pricing'
  if (/\b(best|top|for\s+\w+|use\s+case|tools\s+for)\b/i.test(q)) return 'use-case'
  // Fall back to the seed's intent if the suggestion text is uninformative
  return seedBias === 'unbucketed' ? 'unbucketed' : seedBias
}

// ── Progress checkpoint ─────────────────────────────────────────────────────

function loadProgress(): Progress {
  if (!existsSync(PROGRESS_FILE)) return { processed: [], opportunities: [] }
  return JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) as Progress
}

function saveProgress(p: Progress) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2))
}

// ── Catalog fetch ───────────────────────────────────────────────────────────

async function fetchPublishedTools(): Promise<Array<{ slug: string; name: string }>> {
  const supa = getAdminClient()
  const all: Array<{ slug: string; name: string }> = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from('tools')
      .select('slug, name')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    const rows = (data ?? []) as Array<{ slug: string; name: string }>
    all.push(...rows)
    if (rows.length < PAGE) break
  }
  return all
}

// ── Process one tool ────────────────────────────────────────────────────────

async function processTool(slug: string, name: string): Promise<Opportunity[]> {
  const opps: Opportunity[] = []
  for (const { template, bias } of SEED_PATTERNS) {
    const seed = template(name)
    let suggestions: string[]
    try {
      suggestions = await getSuggestionsThrottled(seed)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ ${slug} — seed "${seed}" failed: ${msg}`)
      continue
    }
    suggestions.forEach((sugg, i) => {
      // Skip the bare tool name (often returned as-is) and exact-seed echoes
      const lower = sugg.toLowerCase().trim()
      if (lower === name.toLowerCase().trim()) return
      if (lower === seed.toLowerCase().trim()) return
      const page_type = bucketBySuggestion(sugg, bias)
      opps.push({
        tool_slug: slug,
        page_type,
        target_keyword: sugg,
        source: 'google-suggest',
        seed_query: seed,
        suggestion_rank: i + 1,
        est_volume_score: Math.round((10 / (i + 1)) * 10) / 10,
      })
    })
  }
  return opps
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const allTools = await fetchPublishedTools()
  let tools = allTools
  if (targetSlug) tools = tools.filter((t) => t.slug === targetSlug)
  if (limit) tools = tools.slice(0, limit)

  console.log(`Source:       Google Suggest`)
  console.log(`Tools:        ${tools.length} (of ${allTools.length} published)`)
  console.log(`Patterns:     ${SEED_PATTERNS.length} per tool`)
  console.log(`Total calls:  ${tools.length * SEED_PATTERNS.length}`)
  console.log(`Mode:         ${isDryRun ? 'DRY-RUN' : 'APPLY'}`)
  console.log('')

  if (isDryRun) {
    console.log('Sample seed queries that would be fired (first tool):')
    if (tools[0]) {
      for (const { template, bias } of SEED_PATTERNS) {
        console.log(`  - "${template(tools[0].name)}" → ${bias}`)
      }
    }
    console.log('')
    console.log('Re-run with --apply to make real Suggest calls.')
    return
  }

  const progress = loadProgress()
  const todo = tools.filter((t) => !progress.processed.includes(t.slug))
  console.log(`Resuming: ${progress.processed.length} done, ${todo.length} remaining\n`)

  let done = 0
  for (const t of todo) {
    const opps = await processTool(t.slug, t.name)
    progress.opportunities.push(...opps)
    progress.processed.push(t.slug)
    done += 1
    if (done % 50 === 0) {
      saveProgress(progress)
      console.log(
        `  · ${done}/${todo.length} tools — ${progress.opportunities.length} opportunities so far`
      )
    }
  }
  saveProgress(progress)

  // Sort + bucket totals
  progress.opportunities.sort((a, b) => b.est_volume_score - a.est_volume_score)
  const totals: Record<PageType, number> = {
    compare: 0,
    alternative: 0,
    'worth-it': 0,
    'how-to': 0,
    'use-case': 0,
    pricing: 0,
    unbucketed: 0,
  }
  for (const o of progress.opportunities) totals[o.page_type] += 1

  writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source: 'google-suggest',
        seed_patterns: SEED_PATTERNS.map((p) => p.template('TOOL')),
        total_tools_processed: progress.processed.length,
        total_opportunities: progress.opportunities.length,
        bucket_totals: totals,
        opportunities: progress.opportunities,
      },
      null,
      2
    )
  )
  console.log('')
  console.log(`✓ Wrote ${progress.opportunities.length} opportunities to ${OUTPUT_FILE}`)
  console.log(`  Bucket totals:`, totals)
  console.log('')
  console.log(`Top 10 by est_volume_score:`)
  for (const o of progress.opportunities.slice(0, 10)) {
    console.log(
      `  · ${o.tool_slug.padEnd(20)} | ${o.page_type.padEnd(11)} | rank ${String(o.suggestion_rank).padStart(2)} | "${o.target_keyword}"`
    )
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
