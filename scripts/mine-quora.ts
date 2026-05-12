/**
 * Phase 7A.fallback — Quora keyword mining via Apify.
 *
 * Uses crawlerbros/quora-search-scraper. For each tool in the
 * top-N-by-view-count cohort, fires one search query:
 *   - "is {tool} worth it"  (worth-it bucket)
 *
 * Quora's value is highest for purchase-intent queries — "is X worth
 * it", "is X good", "X review". One pattern per tool keeps cost low.
 *
 * USAGE:
 *   npm run mine:quora:dry
 *   npm run mine:quora:apply
 *   npm run mine:quora:apply -- --top=300
 *
 * COST: $0.05 actor start + $0.002/result × 5 × 300 ≈ $3.05.
 *
 * OUTPUT: scripts/.quora-opportunities.json
 */
export {}

import { writeFileSync } from 'fs'
import { join } from 'path'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { runActorAndCollect } from '../lib/seo/apify-client'

const OUTPUT_FILE = join(process.cwd(), 'scripts', '.quora-opportunities.json')
const ACTOR_ID = 'crawlerbros/quora-search-scraper'
const DEFAULT_TOP = 300
const RESULTS_PER_QUERY = 5

type PageType = 'compare' | 'alternative' | 'worth-it' | 'how-to' | 'use-case' | 'pricing' | 'unbucketed'

type QuoraResult = {
  question?: string
  questionTitle?: string
  url?: string
  questionUrl?: string
  answerCount?: number
  answersCount?: number
  followerCount?: number
  followersCount?: number
  topics?: string[]
  // The actor varies field names slightly; we read permissively below.
  [k: string]: unknown
}

type Opportunity = {
  tool_slug: string
  page_type: PageType
  target_keyword: string
  source: 'quora'
  search_query: string
  question_text: string
  question_url: string
  quora_answer_count: number
  quora_follow_count: number
  // Score = answers × √(follows + 1) — answers signal real discussion
  // depth; follows signal lurker interest. Sqrt damps follow inflation.
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

async function fetchTopTools(): Promise<Array<{ slug: string; name: string }>> {
  const supa = getAdminClient()
  const { data, error } = await supa
    .from('tools')
    .select('slug, name')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .range(0, top - 1)
  if (error) throw error
  return (data ?? []) as Array<{ slug: string; name: string }>
}

function bucketFromQuestion(q: string, fallback: PageType): PageType {
  const s = q.toLowerCase()
  if (/\b(vs\.?|versus|compared\s+to|comparison)\b/i.test(s)) return 'compare'
  if (/\b(alternative|alternatives|instead\s+of|replace)\b/i.test(s)) return 'alternative'
  if (/\b(worth\s+it|legit|scam|review|reviews|good|reliable)\b/i.test(s)) return 'worth-it'
  if (/\b(how\s+to|tutorial|guide|setup)\b/i.test(s)) return 'how-to'
  if (/\b(pricing|cost|free\s+tier|subscription)\b/i.test(s)) return 'pricing'
  if (/\b(best|top|for\s+\w+)\b/i.test(s)) return 'use-case'
  return fallback
}

async function main() {
  const tools = targetSlug
    ? (await fetchTopTools()).filter((t) => t.slug === targetSlug)
    : await fetchTopTools()
  const queries = tools.map((t) => `is ${t.name} worth it`)

  console.log(`Source:       Quora (via Apify ${ACTOR_ID})`)
  console.log(`Tools:        ${tools.length}`)
  console.log(`Queries:      ${queries.length}`)
  console.log(`Per query:    up to ${RESULTS_PER_QUERY} results`)
  console.log(`Mode:         ${isDryRun ? 'DRY-RUN' : 'APPLY'}`)
  console.log('')

  if (isDryRun) {
    console.log('Sample queries (first 6):')
    for (const q of queries.slice(0, 6)) console.log(`  - "${q}"`)
    console.log('')
    console.log(
      `Re-run with --apply to spend ~$${(0.05 + 0.002 * RESULTS_PER_QUERY * queries.length).toFixed(2)} of Apify credit.`
    )
    return
  }

  if (!process.env.APIFY_TOKEN) {
    console.error('\n❌ APIFY_TOKEN not set in .env.local\n')
    process.exit(1)
  }

  console.log(`Starting Apify actor run with ${queries.length} search queries...`)
  const t0 = Date.now()
  const items = await runActorAndCollect<QuoraResult>(ACTOR_ID, {
    searchQueries: queries,
    maxResults: RESULTS_PER_QUERY,
    proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
  })
  console.log(`Actor returned ${items.length} questions in ${Math.round((Date.now() - t0) / 1000)}s\n`)

  // Map back to tools by name match against the question text
  const toolByName = new Map<string, { slug: string; name: string }>()
  for (const t of tools) toolByName.set(t.name.toLowerCase(), { slug: t.slug, name: t.name })

  const opps: Opportunity[] = []
  for (const item of items) {
    const question = String(item.question ?? item.questionTitle ?? '').trim()
    if (!question) continue
    let matched: { slug: string; name: string } | null = null
    for (const [key, t] of toolByName) {
      if (key.length >= 3 && question.toLowerCase().includes(key)) {
        matched = t
        break
      }
    }
    if (!matched) continue
    const url = String(item.url ?? item.questionUrl ?? '')
    const answers = Number(item.answerCount ?? item.answersCount ?? 0) || 0
    const follows = Number(item.followerCount ?? item.followersCount ?? 0) || 0
    const bucket = bucketFromQuestion(question, 'worth-it')
    opps.push({
      tool_slug: matched.slug,
      page_type: bucket,
      target_keyword: question.slice(0, 200),
      source: 'quora',
      search_query: `is ${matched.name} worth it`,
      question_text: question,
      question_url: url,
      quora_answer_count: answers,
      quora_follow_count: follows,
      est_volume_score: Math.round(answers * Math.sqrt(follows + 1) * 10) / 10,
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
        source: 'quora',
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
      `  · ${o.tool_slug.padEnd(20)} | ${o.page_type.padEnd(11)} | answers=${String(o.quora_answer_count).padStart(3)} follows=${String(o.quora_follow_count).padStart(4)} | "${o.question_text.slice(0, 70)}"`
    )
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err)
  process.exit(1)
})
