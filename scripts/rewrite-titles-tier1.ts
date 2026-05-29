/**
 * Phase 9 Tier-1 (2026-05-27) — DeepSeek-assisted title rewriter.
 *
 * Reads candidates/tier1-candidates.json (the 100 pages currently
 * ranking pos 1–30 in GSC), asks DeepSeek for 3 title suggestions per
 * page + 1-sentence rationale, writes candidates/tier1-rewrites.json
 * for the /admin/tier1-review UI to consume.
 *
 * USAGE:
 *   npm run tier1:rewrite                   # process all (writes JSON)
 *   npm run tier1:rewrite:dry               # show first 3, don't write
 *   npm run tier1:rewrite -- --bucket=1A    # only top-10 pages
 *   npm run tier1:rewrite -- --bucket=1B    # only pos 11–20
 *   npm run tier1:rewrite -- --bucket=1C    # only pos 21–30
 *   npm run tier1:rewrite -- --limit=10     # cap candidate count
 *   npm run tier1:rewrite -- --concurrency=5
 *   npm run tier1:rewrite -- --resume       # skip pages already in output
 *
 * REQUIRED ENV: DEEPSEEK_API_KEY
 */
export {}

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { callDeepSeek, stripJsonFences } from '../lib/plan/deepseek'

type Bucket = '1A' | '1B' | '1C'

type BindingConstraint = 'title' | 'mixed' | 'rank'

type Candidate = {
  page: string
  canonicalUrl: string
  currentTitle: string
  bucket: Bucket
  section: string
  weightedPosition: number
  totalImpressions: number
  totalClicks: number
  avgCtr: number
  priority: number
  bindingConstraint: BindingConstraint
  topQuery: { query: string; impressions: number; position: number }
  queries: Array<{
    query: string
    impressions: number
    clicks: number
    position: number
    ctr: number
  }>
}

type Suggestion = { title: string; rationale: string }

type Rewrite = {
  page: string
  bucket: Bucket
  section: string
  priority: number
  bindingConstraint: BindingConstraint
  currentTitle: string
  weightedPosition: number
  totalImpressions: number
  totalClicks: number
  topQuery: string
  suggestions: Suggestion[]
  generatedAt: string
}

/** Detect question-intent queries → ask for an answer-style title (snippet bait). */
function isQuestionQuery(q: string | undefined): boolean {
  if (!q) return false
  const s = q.toLowerCase().replace(/["“”]/g, '').trim()
  return /\?$/.test(s) || /^(is|are|can|does|do|how|what|which|why|should|when|will)\b/.test(s)
}

const IN_PATH = resolve(process.cwd(), 'candidates/tier1-candidates.json')
const OUT_PATH = resolve(process.cwd(), 'candidates/tier1-rewrites.json')

const args = process.argv.slice(2)
const isDry = args.includes('--dry') || args.includes('--dry-run')
const isResume = args.includes('--resume')
const bucketFlag = args
  .find((a) => a.startsWith('--bucket='))
  ?.split('=')[1] as Bucket | undefined
const limitFlag = parseInt(
  args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0',
  10,
)
const concurrencyFlag = parseInt(
  args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? '3',
  10,
)

const BUCKET_GUIDE: Record<Bucket, string> = {
  '1A':
    'Page already ranks top-10 — the bottleneck is CLICK-THROUGH. Make the title sharper, more specific, more value-promising. Front-load the actual query intent. 50–58 chars.',
  '1B':
    'Page ranks pos 11–20 (page-2 jail). Bottleneck is RELEVANCE for the target query — title must match query intent more tightly AND be magnetic enough to win the click when it surfaces on page 1. 50–58 chars.',
  '1C':
    'Page ranks pos 21–30 (deep page 2/3). Bottleneck is RELEVANCE — Google does not yet think this title clearly answers the query. The new title must contain the actual query language naturally, plus one differentiator. 52–60 chars.',
}

const SYSTEM = `You are an SEO title-tag writer for RightAIChoice — an independent AI-tools decision engine. Your job is to rewrite a <title> tag to either earn more clicks at the page's current rank or push the page higher by aligning the title with the actual search query.

CONSTRAINTS:
- 50–60 characters total. Google truncates ~60. Never exceed 65.
- No clickbait, no all caps, no exclamation marks.
- Always end with " | RightAIChoice".
- Be specific. "Compare X vs Y in 2026" beats "X vs Y comparison".
- Include the year (2026) when natural.
- Compare pages: include both tool names and the user's actual search phrasing.
- Tool pages: lead with the tool name + searcher's intent (pricing, alternatives, features).
- Blog pages: lead with the concrete promise (number, benchmark, year).

Return ONLY valid JSON of shape:
{"suggestions":[{"title":"...","rationale":"..."},{"title":"...","rationale":"..."},{"title":"...","rationale":"..."}]}
Exactly 3 suggestions. Each rationale is 1 sentence (≤25 words). Vary the angle across the 3 — do not return near-duplicates. No markdown, no commentary.`

async function rewriteOne(c: Candidate): Promise<Rewrite> {
  const topQueries = c.queries
    .slice(0, 5)
    .map(
      (q) =>
        `- "${q.query}" (impr ${q.impressions}, pos ${q.position.toFixed(1)}, clicks ${q.clicks})`,
    )
    .join('\n')

  const questionHint = isQuestionQuery(c.topQuery?.query)
    ? `\nNOTE: the top query is a QUESTION. Make at least one of the 3 titles an answer-style title that mirrors that question — it can win the featured snippet / People-Also-Ask box.`
    : ''

  const userPrompt = `Page: ${c.page}
Current title: ${c.currentTitle}
Bucket: ${c.bucket} — ${BUCKET_GUIDE[c.bucket]}
Weighted position: ${c.weightedPosition.toFixed(2)}
28-day impressions: ${c.totalImpressions}  clicks: ${c.totalClicks}  CTR: ${(c.avgCtr * 100).toFixed(2)}%
Top queries:
${topQueries}${questionHint}

Write 3 candidate titles. Each must improve on the current title against the bucket's bottleneck. Vary the angle.`

  const raw = await callDeepSeek({
    system: SYSTEM,
    user: userPrompt,
    max_tokens: 700,
    json: true,
    timeout_ms: 30000,
  })

  let parsed: { suggestions: Suggestion[] }
  try {
    parsed = JSON.parse(stripJsonFences(raw)) as { suggestions: Suggestion[] }
  } catch (e) {
    throw new Error(`DeepSeek output not valid JSON: ${(e as Error).message}`)
  }

  const suggestions = (parsed.suggestions ?? [])
    .slice(0, 3)
    .filter((s) => s?.title && s?.rationale)
  if (suggestions.length === 0) {
    throw new Error('DeepSeek returned 0 valid suggestions')
  }

  return {
    page: c.page,
    bucket: c.bucket,
    section: c.section,
    priority: c.priority,
    bindingConstraint: c.bindingConstraint,
    currentTitle: c.currentTitle,
    weightedPosition: c.weightedPosition,
    totalImpressions: c.totalImpressions,
    totalClicks: c.totalClicks,
    topQuery: c.topQuery?.query ?? '',
    suggestions,
    generatedAt: new Date().toISOString(),
  }
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('[tier1:rewrite] DEEPSEEK_API_KEY missing — abort.')
    process.exit(1)
  }
  if (!existsSync(IN_PATH)) {
    console.error(
      `[tier1:rewrite] missing ${IN_PATH} — run \`npm run tier1:candidates\` first.`,
    )
    process.exit(1)
  }

  const input = JSON.parse(readFileSync(IN_PATH, 'utf-8')) as {
    candidates: Candidate[]
  }
  let candidates = input.candidates ?? []

  if (bucketFlag) candidates = candidates.filter((c) => c.bucket === bucketFlag)

  let existing: Rewrite[] = []
  if (isResume && existsSync(OUT_PATH)) {
    existing =
      (JSON.parse(readFileSync(OUT_PATH, 'utf-8')) as { rewrites: Rewrite[] })
        .rewrites ?? []
    const seen = new Set(existing.map((r) => r.page))
    const before = candidates.length
    candidates = candidates.filter((c) => !seen.has(c.page))
    console.log(
      `[tier1:rewrite] resume — ${existing.length} already done, ${before - candidates.length} skipped`,
    )
  }

  if (limitFlag > 0) candidates = candidates.slice(0, limitFlag)

  console.log(
    `[tier1:rewrite] processing ${candidates.length} candidates (concurrency=${concurrencyFlag}, dry=${isDry})`,
  )

  const results: Rewrite[] = [...existing]
  const fails: Array<{ page: string; error: string }> = []
  let done = 0
  let bailDryEarly = false

  async function worker(slice: Candidate[]) {
    for (const c of slice) {
      if (bailDryEarly) return
      try {
        const r = await rewriteOne(c)
        results.push(r)
        done++
        console.log(
          `[tier1:rewrite] ${done}/${candidates.length}  ${c.page}  → "${r.suggestions[0].title}"`,
        )
      } catch (e) {
        const msg = (e as Error).message
        fails.push({ page: c.page, error: msg })
        done++
        console.warn(
          `[tier1:rewrite] ${done}/${candidates.length}  FAIL  ${c.page}  ${msg}`,
        )
      }
      if (isDry && done >= 3) {
        bailDryEarly = true
        return
      }
    }
  }

  const stride = Math.max(1, concurrencyFlag)
  const slices: Candidate[][] = Array.from({ length: stride }, () => [])
  candidates.forEach((c, i) => slices[i % stride].push(c))
  await Promise.all(slices.map(worker))

  const out = {
    generatedAt: new Date().toISOString(),
    sourceFile: 'candidates/tier1-candidates.json',
    totals: {
      processed: candidates.length,
      newSucceeded: results.length - existing.length,
      newFailed: fails.length,
      totalInOutput: results.length,
    },
    failures: fails,
    rewrites: results.sort((a, b) => b.priority - a.priority),
  }

  if (isDry) {
    console.log(
      `[tier1:rewrite] dry-run — would write ${results.length - existing.length} new rewrites`,
    )
    console.log(JSON.stringify(out.rewrites.slice(0, 3), null, 2))
    return
  }

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf-8')
  console.log(`[tier1:rewrite] wrote ${results.length} rewrites → ${OUT_PATH}`)
  if (fails.length > 0) {
    console.warn(
      `[tier1:rewrite] ${fails.length} pages failed — rerun with --resume to retry`,
    )
  }
}

main().catch((e) => {
  console.error('[tier1:rewrite] fatal:', e)
  process.exit(1)
})
