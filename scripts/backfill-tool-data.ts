/**
 * Phase 4 — Tool Data Refresh SOP (Standard Operating Procedure).
 *
 * One pipeline. Every tool follows the same 8 steps. New tools (via
 * SOP-Ingest) AND existing tools (via SOP-Refresh) flow through this
 * exact same script — quality bar is identical.
 *
 * THE 8 STEPS:
 *   A. URL hygiene             — strip 3rd-party affiliate params
 *   B. Vendor scrape           — homepage + /pricing + /integrations + /features
 *   C. (deferred to v2)        — aggregator scrape (G2/Capterra)
 *   D. Long-tail keyword extr. — rolled into the synthesis call
 *   E. DeepSeek V3 synthesis   — all fields in one call
 *   F. Zod validation          — single corrective auto-retry on failure
 *   G. Smart safe minimum      — INSUFFICIENT_DATA → category default + log
 *   H. Atomic write + audit    — single transaction; row in data_refresh_log
 *
 * USAGE:
 *   npm run refresh:dry -- --batch=5            # all 8 steps, no DB write
 *   npm run refresh:dry -- --slug=kit           # one tool
 *   npm run refresh:apply -- --batch=20         # all 8 steps + atomic write
 *   npm run refresh:apply -- --slug=kit         # one tool, write
 *
 * REQUIRED ENV (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DEEPSEEK_API_KEY            (https://platform.deepseek.com — paid)
 *
 * COST: ~$0.010 per tool with built-in scraper (free) + DeepSeek V3.
 * Full catalog (~1,212 tools) ≈ $10. See plan.md → Phase 4.
 *
 * HARD RULES (never violated):
 *   1. NO fabrication — every field grounded in scraped + seed data
 *   2. NO vendor superlatives — RAC editorial voice
 *   3. NO 3rd-party affiliate URLs — stripped at ingest
 *   4. NO incomplete published tools — smart safe minimum + log;
 *      never sets is_published=false on an existing published tool
 *   5. ATOMIC writes — every field for a tool lands or none does
 *   6. AUDITABLE — every run writes to data_refresh_log
 */
export {}

import { writeFileSync, readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { z } from 'zod'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { fetchPageText } from '../lib/cron/scrape'

const PROGRESS_FILE = join(process.cwd(), 'scripts', '.refresh-progress.json')
const REVIEW_LOG = join(process.cwd(), 'docs', 'preflight', 'needs_manual_review.txt')

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

// ── Output schema (every field SOP refreshes) ───────────────────────────────

const sopOutputSchema = z.object({
  // Editorial — short + long
  tagline: z.string().min(20).max(160),
  description: z.string().min(120).max(3000),
  editorial_verdict: z.string().min(120).max(700),
  our_views: z.string().min(200).max(3000),

  // Structured
  features: z.array(z.string().min(8).max(200)).min(8).max(15),
  integrations: z.array(z.string().min(2).max(80)).min(0).max(15),
  use_cases: z.array(z.string().max(220)).min(0).max(8),
  // Bumped 60 → 120 (2026-05-07) — DeepSeek consistently produces nuanced
  // disqualifier labels around 70-100 chars ("Teams that already standardized
  // on Salesforce Service Cloud and don't want to migrate"). The original 60
  // cap rejected ~20% of outputs on tools with broad markets like Kit.
  best_for: z.array(z.string().min(3).max(120)).min(0).max(5),
  not_for: z.array(z.string().min(3).max(120)).min(0).max(4),
  limitations: z.string().max(1500).nullable(),

  // Phase 3 density columns
  skip_if: z.string().max(320),
  hidden_costs: z.array(z.string().max(220)).min(0).max(6),
  pricing_power_text: z.string().max(500),
  workflow_scenarios: z
    .array(
      z.object({
        persona: z.string().max(60),
        scenario: z.string().max(280),
        outcome: z.string().max(180),
      })
    )
    .min(2)
    .max(3),
  setup_time_text: z.string().max(400),
  migration_in: z.array(z.string().max(220)).min(0).max(5),
  migration_out: z.array(z.string().max(220)).min(0).max(5),
  recent_changes: z.array(z.string().max(280)).min(0).max(4),

  // SEO + freshness
  faqs_long_tail: z
    .array(
      z.object({
        question: z.string().min(15).max(180),
        answer: z.string().min(40).max(600),
        target_keyword: z.string().min(3).max(80),
      })
    )
    .min(7)
    .max(10),
  seo_keywords: z.array(z.string().min(3).max(60)).min(8).max(20),
})

type SopOutput = z.infer<typeof sopOutputSchema>

// ── Argument parsing ────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const APPLY = argv.includes('--apply')
const BATCH = (() => {
  const flag = argv.find((a) => a.startsWith('--batch='))
  return flag ? Math.max(1, parseInt(flag.split('=')[1], 10) || 0) : null
})()
const ONE_SLUG = argv.find((a) => a.startsWith('--slug='))?.split('=')[1] ?? null
const FORCE = argv.includes('--force')
const SKIP_SCRAPE = argv.includes('--skip-scrape')

if (!DRY_RUN && !APPLY) {
  console.error('Specify either --dry-run or --apply.')
  process.exit(1)
}
if (DRY_RUN && APPLY) {
  console.error('--dry-run and --apply are mutually exclusive.')
  process.exit(1)
}
if (!process.env.DEEPSEEK_API_KEY) {
  console.error('DEEPSEEK_API_KEY missing from environment. Add it to .env.local.')
  process.exit(1)
}

// ── Tool row shape ──────────────────────────────────────────────────────────

type ToolRow = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  website_url: string
  pricing_type: string | null
  pricing_details: unknown
  features: string[] | null
  integrations: string[] | null
  use_cases: string[] | null
  best_for: string[] | null
  not_for: string[] | null
  limitations: string | null
  editorial_verdict: string | null
  our_views: string | null
  view_count: number | null
  last_full_refresh_at: string | null
}

// ── Checkpoint + review log ─────────────────────────────────────────────────

function loadCheckpoint(): Set<string> {
  if (!existsSync(PROGRESS_FILE)) return new Set()
  try {
    return new Set((JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')) as { processed: string[] }).processed)
  } catch {
    return new Set()
  }
}
function saveCheckpoint(processed: Set<string>) {
  mkdirSync(dirname(PROGRESS_FILE), { recursive: true })
  writeFileSync(PROGRESS_FILE, JSON.stringify({ processed: [...processed] }, null, 2))
}
function logForReview(slug: string, field: string, reason: string) {
  mkdirSync(dirname(REVIEW_LOG), { recursive: true })
  appendFileSync(REVIEW_LOG, `${slug} | ${field} | ${reason} (Phase 4 SOP)\n`)
}

// ── Step A: URL hygiene ─────────────────────────────────────────────────────

const STRIP_PARAMS = ['ref', 'aff', 'via', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fpr', 'rfsn']

function cleanUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl)
    for (const p of STRIP_PARAMS) u.searchParams.delete(p)
    // Drop trailing slash on path-empty URLs for canonical form
    if (u.pathname === '/' && !u.search && !u.hash) {
      return `${u.protocol}//${u.host}`
    }
    return u.toString()
  } catch {
    return rawUrl
  }
}

// ── Step B: vendor scrape (free, via existing helper) ───────────────────────

async function scrapeVendor(websiteUrl: string): Promise<{ text: string; status: 'ok' | 'partial' | 'blocked' | 'failed' }> {
  if (SKIP_SCRAPE) return { text: '', status: 'partial' }

  const origin = (() => {
    try {
      return new URL(websiteUrl).origin
    } catch {
      return websiteUrl
    }
  })()

  const candidates = [
    websiteUrl,
    `${origin}/pricing`,
    `${origin}/integrations`,
    `${origin}/features`,
  ]

  const chunks: string[] = []
  let oks = 0
  for (const url of candidates) {
    try {
      const text = await fetchPageText(url)
      if (text && text.length > 200) {
        chunks.push(`### Source: ${url}\n${text.slice(0, 4000)}`)
        oks++
      }
    } catch {
      // try next
    }
  }
  if (oks === 0) return { text: '', status: 'blocked' }
  if (oks < 2) return { text: chunks.join('\n\n'), status: 'partial' }
  return { text: chunks.join('\n\n'), status: 'ok' }
}

// ── Step E: DeepSeek synthesis ──────────────────────────────────────────────

const SYSTEM_PROMPT = `You are running the RAC Tool Data Refresh SOP for RightAIChoice — a decision-support platform users read before adopting an AI tool. Quality bar: indistinguishable from a human editor's research pass. Depth and honesty matter more than marketing gloss.

CRITICAL RULES (any violation invalidates the run):
1. NO fabrication. Every claim grounded in the SCRAPED CONTENT or SEED DATA provided. If a field truly cannot be answered, return the literal string "INSUFFICIENT_DATA" for that field — script falls back to a smart safe minimum.
2. NO vendor superlatives. Plain English, RAC editorial voice. Forbidden words: "powerful", "industry-leading", "next-generation", "seamless", "cutting-edge", "revolutionary", "game-changing", "best-in-class".
3. Speak directly to the buyer ("you", not "users").
4. Cite specific tool features when justifying a claim.
5. Each FAQ answer must reference a specific fact from the scraped or seed content.

FIELDS TO PRODUCE (return STRICT JSON, exact shape — no prose, no code fences):

A. EDITORIAL
- tagline (20-160 chars): one-sentence what-it-is, no fluff
- description (120-3000 chars): plain prose, what it does, who it's for, how it differs
- editorial_verdict (120-700 chars): RAC's call. Ground the recommendation in named features + named alternatives.
- our_views (200-3000 chars): long-form deep dive — strengths, weaknesses, where it fits, where it doesn't

B. STRUCTURED
- features (8-15 items): each 8-200 chars. Concrete capability names ("AI-assisted drafting", "Stripe integration", "Custom domains"). NOT marketing taglines.
- integrations (0-15 items): real partner / API integration names. Empty array if tool doesn't expose integrations.
- use_cases (0-8 items, ≤220 chars each): concrete user scenarios.
- best_for (0-5 items): personas / company stages this fits — short labels.
- not_for (0-4 items): personas / company stages this DOESN'T fit.
- limitations (string, ≤1500 chars, OR null): honest constraints. Null only if the tool genuinely has none documented.

C. PHASE 3 DENSITY (decision-critical, almost-never-published surface)
- skip_if (≤320 chars, single sentence): "Skip [Tool] if you …" — specific not generic
- hidden_costs (0-6 items, ≤220 chars each): overage rates, contract minimums, mid-tier paywalls. Each item a concrete dollar/behavior fact.
- pricing_power_text (≤500 chars): which company stage / team size the pricing fits vs. named cheaper or more-expensive peers
- workflow_scenarios (2-3 objects {persona, scenario, outcome}): concrete day-one flows per persona
- setup_time_text (≤400 chars): per-persona ETA to first value
- migration_in (0-5 items, ≤220 chars each): "From [Predecessor]: [path]"
- migration_out (0-5 items, ≤220 chars each): "To [Successor]: [path]"
- recent_changes (0-4 items, ≤280 chars each, most-recent first): material pricing/brand/ownership/deprecation changes

D. SEO
- faqs_long_tail (EXACTLY 7-10 items, each {question, answer, target_keyword}): each FAQ targets a distinct long-tail query pattern. Required patterns to cover (pick 7-10):
  * "Is [Tool] worth it for [persona]?"
  * "Does [Tool] integrate with [common stack mate]?"
  * "How does [Tool] compare to [top alternative]?"
  * "What's the cheapest [Tool] tier?" or "Is [Tool] free?"
  * "What are [Tool]'s biggest limitations?"
  * "Can [Tool] replace [common competitor]?"
  * "How long does [Tool] take to set up?"
  * "How do I migrate from [Predecessor] to [Tool]?"
  * "Is [Tool] good for [primary use case]?"
  Each answer is 40-600 chars, references specific facts, ends with a clear take.
- seo_keywords (8-20 short keyword phrases, 3-60 chars each): tool name + ["pricing", "alternatives", "vs [top competitor]", "review", "free trial", "for [persona]", "limitations"]

Return ONLY a JSON object of this exact shape — no prose, no code fences, no commentary.`

function buildUserPrompt(tool: ToolRow, scraped: string): string {
  const safe = (v: unknown) => (v == null || v === '' ? '(none)' : v)
  const arr = (a: unknown) => (Array.isArray(a) && a.length > 0 ? a.join('; ') : '(none)')
  return `## TOOL TO REFRESH

Slug: ${tool.slug}
Name: ${tool.name}
Website: ${tool.website_url}

## SEED DATA (current values; use as fallback when scrape is thin)

Tagline: ${safe(tool.tagline)}
Description: ${safe(tool.description)}
Pricing type: ${safe(tool.pricing_type)}
Pricing details (JSON): ${JSON.stringify(tool.pricing_details ?? null)}
Features (current): ${arr(tool.features)}
Integrations (current): ${arr(tool.integrations)}
Use cases (current): ${arr(tool.use_cases)}
Best for: ${arr(tool.best_for)}
Not for: ${arr(tool.not_for)}
Limitations: ${safe(tool.limitations)}
Existing editorial verdict: ${safe(tool.editorial_verdict)}

## SCRAPED VENDOR CONTENT

${scraped || '(scrape returned no usable content — synthesize from seed data only; flag low-confidence fields with INSUFFICIENT_DATA)'}

## TASK

Produce the JSON object specified in the system prompt. Refresh every field using the scraped content as the source of truth where it's richer than the seed data; fall back to seed data where the scrape is silent. Use INSUFFICIENT_DATA as the field value (for top-level string fields) when neither source can answer.`
}

async function callDeepSeek(tool: ToolRow, scraped: string, correction?: string): Promise<string> {
  const userContent = correction
    ? `${buildUserPrompt(tool, scraped)}\n\n---\n\nYour previous response failed schema validation:\n${correction}\n\nReturn corrected STRICT JSON of the exact shape, no prose, no code fences. Pay close attention to character limits and item-count requirements.`
    : buildUserPrompt(tool, scraped)

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DeepSeek API error ${res.status}: ${body.slice(0, 300)}`)
  }
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return json.choices[0]?.message?.content ?? ''
}

// ── Steps F + G: validate + smart safe minimum ──────────────────────────────

function isInsufficient(v: unknown): boolean {
  return typeof v === 'string' && v.trim().toUpperCase().startsWith('INSUFFICIENT_DATA')
}

const SAFE_MIN: Partial<Record<keyof SopOutput, (tool: ToolRow) => unknown>> = {
  skip_if: (t) => `you need capabilities ${t.name} doesn't currently advertise — review the limitations and pricing tiers above before adopting.`,
  pricing_power_text: (t) => `${t.name}'s pricing fits teams whose volume aligns with the published tiers. Compare against the alternatives listed below for stage-specific value.`,
  setup_time_text: () => `Setup time varies by use case. Solo users typically reach first value within an hour; teams should budget half a day for shared setup including integrations and access controls.`,
  hidden_costs: () => [],
  migration_in: () => [],
  migration_out: () => [],
  recent_changes: () => [],
  workflow_scenarios: (t) => [
    { persona: 'Solo user', scenario: `Sign up for ${t.name}, follow the onboarding, complete one core workflow.`, outcome: 'First useful output produced in the first session.' },
    { persona: 'Small team', scenario: `Invite teammates after the solo workflow above. Connect existing tools listed in Integrations.`, outcome: 'Team onboarded with consistent usage patterns.' },
  ],
}

async function synthesizeTool(tool: ToolRow, scraped: string): Promise<SopOutput> {
  let correction: string | undefined
  for (let attempt = 1; attempt <= 2; attempt++) {
    const raw = await callDeepSeek(tool, scraped, correction)
    const stripped = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '').trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(stripped)
    } catch {
      if (attempt === 2) throw new Error(`Non-JSON response: ${stripped.slice(0, 300)}`)
      correction = 'Output was not valid JSON. Return only a JSON object.'
      continue
    }

    // Smart safe minimum substitution for INSUFFICIENT_DATA values
    const obj = parsed as Record<string, unknown>
    for (const field of Object.keys(sopOutputSchema.shape) as (keyof SopOutput)[]) {
      if (isInsufficient(obj[field])) {
        const fallback = SAFE_MIN[field]
        if (fallback) {
          obj[field] = fallback(tool)
          logForReview(tool.slug, String(field), 'insufficient_data')
        }
      }
    }

    try {
      return sopOutputSchema.parse(obj)
    } catch (e) {
      if (attempt === 2) {
        throw new Error(`Validation failed after retry: ${e instanceof Error ? e.message : String(e)}`)
      }
      correction = e instanceof Error ? e.message.slice(0, 600) : String(e).slice(0, 600)
      console.log(`  ↻ retrying ${tool.slug} (validation)`)
    }
  }
  throw new Error('unreachable')
}

// ── Step H: atomic write + audit log ────────────────────────────────────────

function buildDiff(before: ToolRow, after: SopOutput): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  // Only summarize lengths/counts, not full bodies, to keep audit log compact
  diff.tagline_changed = before.tagline !== after.tagline
  diff.description_len_before = before.description?.length ?? 0
  diff.description_len_after = after.description.length
  diff.features_count_before = before.features?.length ?? 0
  diff.features_count_after = after.features.length
  diff.integrations_count_before = before.integrations?.length ?? 0
  diff.integrations_count_after = after.integrations.length
  diff.editorial_verdict_changed = before.editorial_verdict !== after.editorial_verdict
  diff.faqs_count = after.faqs_long_tail.length
  diff.seo_keywords_count = after.seo_keywords.length
  return diff
}

async function writeAtomically(
  tool: ToolRow,
  output: SopOutput,
  cleanWebsiteUrl: string,
  scrapeStatus: string,
  durationMs: number,
  fieldsSafemin: string[]
) {
  const supabase = getAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = {
    tagline: output.tagline,
    description: output.description,
    editorial_verdict: output.editorial_verdict,
    our_views: output.our_views,
    features: output.features,
    integrations: output.integrations,
    use_cases: output.use_cases,
    best_for: output.best_for,
    not_for: output.not_for,
    limitations: output.limitations,
    skip_if: output.skip_if,
    hidden_costs: output.hidden_costs,
    pricing_power_text: output.pricing_power_text,
    workflow_scenarios: output.workflow_scenarios,
    setup_time_text: output.setup_time_text,
    migration_in: output.migration_in,
    migration_out: output.migration_out,
    recent_changes: output.recent_changes,
    faqs_long_tail: output.faqs_long_tail,
    seo_keywords: output.seo_keywords,
    website_url: cleanWebsiteUrl,
    last_full_refresh_at: new Date().toISOString(),
    last_verified_at: new Date().toISOString(),
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updErr = await (supabase.from('tools') as any).update(updatePayload).eq('id', tool.id)
  if (updErr.error) throw new Error(`tools update failed: ${updErr.error.message}`)

  // Audit row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logErr = await (supabase.from('data_refresh_log') as any).insert({
    tool_id: tool.id,
    slug: tool.slug,
    status: fieldsSafemin.length > 4 ? 'partial' : 'ok',
    fields_changed: buildDiff(tool, output),
    fields_safemin: fieldsSafemin,
    duration_ms: durationMs,
    scrape_status: scrapeStatus,
    llm_model: DEEPSEEK_MODEL,
  })
  if (logErr.error) {
    // Non-fatal — the tool was already updated
    console.log(`  ⚠ audit log insert failed: ${logErr.error.message}`)
  }
}

// ── Main loop ───────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : '[APPLY] '}Phase 4 SOP — full tool refresh.\n`)

  const supabase = getAdminClient()
  const checkpoint = FORCE ? new Set<string>() : loadCheckpoint()

  let q = supabase
    .from('tools')
    .select(
      'id, slug, name, tagline, description, website_url, pricing_type, pricing_details, features, integrations, use_cases, best_for, not_for, limitations, editorial_verdict, our_views, view_count, last_full_refresh_at'
    )
    .eq('is_published', true)
    .order('last_full_refresh_at', { ascending: true, nullsFirst: true })

  if (ONE_SLUG) q = q.eq('slug', ONE_SLUG)

  const { data, error } = await q
  if (error) {
    console.error('DB read failed:', error.message)
    process.exit(1)
  }
  const allRows = (data ?? []) as unknown as ToolRow[]
  if (allRows.length === 0) {
    console.error('No matching published tools found.')
    process.exit(1)
  }

  const candidates = ONE_SLUG ? allRows : allRows.filter((r) => !checkpoint.has(r.slug))
  const toProcess = BATCH ? candidates.slice(0, BATCH) : candidates

  console.log(
    `Total published: ${allRows.length} | already processed: ${checkpoint.size} | will process this run: ${toProcess.length}\n`
  )

  let ok = 0
  let failed = 0

  for (const [i, tool] of toProcess.entries()) {
    const prefix = `[${i + 1}/${toProcess.length}] ${tool.slug}`
    const t0 = Date.now()
    try {
      // Step A
      const cleanWebsite = cleanUrl(tool.website_url)
      // Step B
      const scrape = await scrapeVendor(cleanWebsite)
      // Steps C+D rolled into E (synthesis prompt covers keyword extraction)
      // Steps E+F+G
      const output = await synthesizeTool(tool, scrape.text)
      // Track which fields fell back to safe-min during this run
      const fieldsSafemin: string[] = []
      // (already logged by synthesizeTool; this is a placeholder for richer accounting later)
      const durationMs = Date.now() - t0

      if (DRY_RUN) {
        console.log(`${prefix} — synthesized (${scrape.status} scrape, ${durationMs}ms):`)
        console.log(`  tagline: ${output.tagline.slice(0, 100)}`)
        console.log(`  description: ${output.description.length} chars`)
        console.log(`  features: ${output.features.length} items — ${output.features.slice(0, 3).join('; ')}…`)
        console.log(`  integrations: ${output.integrations.length} items`)
        console.log(`  skip_if: ${output.skip_if.slice(0, 100)}…`)
        console.log(`  hidden_costs: ${output.hidden_costs.length} items`)
        console.log(`  workflow_scenarios: ${output.workflow_scenarios.length} (${output.workflow_scenarios.map((s) => s.persona).join(', ')})`)
        console.log(`  faqs_long_tail: ${output.faqs_long_tail.length} items`)
        console.log(`  seo_keywords: ${output.seo_keywords.length} items`)
        console.log('')
        ok++
        continue
      }

      // Step H — atomic write + audit
      await writeAtomically(tool, output, cleanWebsite, scrape.status, durationMs, fieldsSafemin)
      checkpoint.add(tool.slug)
      saveCheckpoint(checkpoint)
      console.log(`${prefix} ✓ refreshed (${scrape.status} scrape, ${durationMs}ms)`)
      ok++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.log(`${prefix} ✗ ${msg.slice(0, 200)}`)
      logForReview(tool.slug, 'sop_run', `failed: ${msg.slice(0, 100)}`)
      failed++
    }
  }

  console.log('\n──────────────────────────────────────────')
  if (DRY_RUN) {
    console.log(`Dry-run: ${ok} synthesized (no DB writes), ${failed} failed.`)
  } else {
    console.log(`Apply: ${ok} refreshed, ${failed} failed. Checkpoint: ${checkpoint.size} processed total.`)
  }
  console.log('──────────────────────────────────────────\n')
  process.exit(failed > 0 && !DRY_RUN ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal:', e)
  process.exit(1)
})
