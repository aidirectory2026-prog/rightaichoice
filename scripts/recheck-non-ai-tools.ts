/**
 * Phase 9 Day-4 (2026-05-29) — Strict re-check for the 262 tools the first-pass
 * classifier flagged as non_ai.
 *
 * Per user directive: "if there is any feature of AI into it, we will consider
 * it as an AI tool." So this pass uses a much richer per-tool context (features,
 * models, integrations, full description, tagline) and a stricter prompt: ANY
 * AI capability → keep. Only tools with truly zero AI surface go to delete.
 *
 * Reads:  candidates/non-ai-audit.json (filters classification === 'non_ai')
 * Writes: candidates/non-ai-recheck.json with { keep | delete } verdicts
 *
 * USAGE:
 *   npm run recheck:non-ai                    # full re-check
 *   npm run recheck:non-ai -- --resume        # skip already verdicted
 *   npm run recheck:non-ai -- --concurrency=3
 */
export {}

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { callDeepSeek, stripJsonFences } from '../lib/plan/deepseek'

type Verdict = 'keep' | 'delete'

type Decision = {
  slug: string
  name: string
  classification: 'ai_native' | 'ai_enabled' | 'non_ai'
  rationale: string
  categories: string[]
}

type FullToolRow = {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  features: string[] | null
  models: string[] | null
  integrations: string[] | null
  use_cases: string[] | null
  has_api: boolean | null
  categories: string[]
}

type RecheckRow = {
  slug: string
  name: string
  prior_rationale: string
  verdict: Verdict
  reason: string
  decided_at: string
}

const OUT_PATH = resolve(process.cwd(), 'candidates/non-ai-recheck.json')

const args = process.argv.slice(2)
const isResume = args.includes('--resume')
const concurrencyFlag = parseInt(
  args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? '3',
  10,
)
const BATCH_SIZE = 10 // smaller batches than first pass — more context per tool

const SYSTEM_PROMPT = `You re-examine SaaS tools that a first-pass classifier flagged as "no AI."

Your job is conservative: keep anything that has ANY meaningful AI feature, even
if AI is a small part of the product. The bias is toward "keep."

Mark "delete" ONLY when ALL of the following are true:
- No generative AI feature (text/image/audio/video/code generation)
- No ML-powered feature visible to users (smart suggest, summarize, predict, classify, detect, transcribe, etc.)
- No agent / copilot / chat assistant feature
- AI is absent OR is pure marketing veneer over rule-based / template-based / keyword-matching logic

Specific keep signals to watch for:
- Any product page mentions "AI", "ML", "smart X", "auto-X", "predict X", "copilot", "assistant", "summarize", "transcribe", "generate"
- Underlying models listed (GPT, Claude, Whisper, Stable Diffusion, etc.)
- Features include classify, detect, suggest, recommend, score, predict, translate (when ML-driven)
- Specific edge cases: DaVinci Resolve has Magic Mask / Voice Isolation / Smart Reframe (KEEP). Tldraw has Make Real (KEEP). Kagi has The Assistant (KEEP). Tools with neural-net backends but no user-facing AI surface stay delete.

Output strict JSON: {"results":[{"slug":"...","verdict":"keep|delete","reason":"<15 words citing specific feature or confirming absence>"}]}`

function buildBatchPrompt(tools: FullToolRow[]): string {
  return (
    'Re-check these tools previously flagged as non-AI. Return JSON, one verdict per slug.\n\n' +
    tools
      .map((t, i) => {
        const cats = t.categories.length > 0 ? `[${t.categories.join(', ')}]` : '[uncategorized]'
        const lines: string[] = []
        lines.push(`${i + 1}. ${t.name} (slug=${t.slug}) ${cats}`)
        if (t.tagline) lines.push(`   tagline: ${t.tagline.slice(0, 200)}`)
        if (t.description) lines.push(`   description: ${t.description.slice(0, 600).replace(/\n/g, ' ')}`)
        if (t.features && t.features.length > 0)
          lines.push(`   features: ${t.features.slice(0, 12).join('; ')}`)
        if (t.models && t.models.length > 0) lines.push(`   models: ${t.models.join(', ')}`)
        if (t.integrations && t.integrations.length > 0)
          lines.push(`   integrations: ${t.integrations.slice(0, 10).join(', ')}`)
        if (t.use_cases && t.use_cases.length > 0)
          lines.push(`   use cases: ${t.use_cases.slice(0, 6).join('; ')}`)
        if (t.has_api === true) lines.push(`   has API`)
        return lines.join('\n')
      })
      .join('\n\n')
  )
}

async function recheckBatch(tools: FullToolRow[], priorRationale: Map<string, string>): Promise<RecheckRow[]> {
  const raw = await callDeepSeek({
    system: SYSTEM_PROMPT,
    user: buildBatchPrompt(tools),
    max_tokens: 4096,
  })
  const clean = stripJsonFences(raw)
  const parsed = JSON.parse(clean) as { results: Array<{ slug: string; verdict: Verdict; reason: string }> }
  const bySlug = new Map(parsed.results.map((r) => [r.slug, r]))
  const now = new Date().toISOString()
  return tools.map((t) => {
    const hit = bySlug.get(t.slug)
    if (!hit) {
      return {
        slug: t.slug,
        name: t.name,
        prior_rationale: priorRationale.get(t.slug) ?? '',
        verdict: 'keep' as Verdict, // missing → conservative keep
        reason: 'classifier returned no entry; keeping by default',
        decided_at: now,
      }
    }
    return {
      slug: t.slug,
      name: t.name,
      prior_rationale: priorRationale.get(t.slug) ?? '',
      verdict: hit.verdict,
      reason: hit.reason,
      decided_at: now,
    }
  })
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('missing DEEPSEEK_API_KEY')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('missing Supabase env')

  const audit = JSON.parse(
    readFileSync(resolve(process.cwd(), 'candidates/non-ai-audit.json'), 'utf-8'),
  ) as { decisions: Decision[] }

  const nonAi = audit.decisions.filter((d) => d.classification === 'non_ai')
  const priorRationale = new Map(nonAi.map((d) => [d.slug, d.rationale]))
  const slugs = nonAi.map((d) => d.slug)
  console.log(`[recheck] pulling full context for ${slugs.length} non-AI candidates`)

  const supa = createClient(supabaseUrl, supabaseKey)
  // Pagination just in case > 1000 slugs
  type Row = {
    slug: string
    name: string
    tagline: string | null
    description: string | null
    features: string[] | null
    models: string[] | null
    integrations: string[] | null
    use_cases: string[] | null
    has_api: boolean | null
    tool_categories: Array<{ categories: { slug: string } | null }>
  }
  const tools: Row[] = []
  for (let i = 0; i < slugs.length; i += 500) {
    const chunk = slugs.slice(i, i + 500)
    const { data, error } = await supa
      .from('tools')
      .select(
        `slug, name, tagline, description, features, models, integrations, use_cases, has_api,
         tool_categories(categories(slug))`,
      )
      .in('slug', chunk)
    if (error) throw new Error(`tools fetch: ${error.message}`)
    tools.push(...((data as unknown as Row[]) ?? []))
  }
  console.log(`[recheck] fetched full context for ${tools.length} tools`)

  const allInputs: FullToolRow[] = tools.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    features: t.features,
    models: t.models,
    integrations: t.integrations,
    use_cases: t.use_cases,
    has_api: t.has_api,
    categories: t.tool_categories.map((tc) => tc.categories?.slug).filter((s): s is string => !!s),
  }))

  // Resume support
  let prior: RecheckRow[] = []
  if (isResume && existsSync(OUT_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(OUT_PATH, 'utf-8')) as { results: RecheckRow[] }
      prior = parsed.results ?? []
      console.log(`[recheck] resume — ${prior.length} already verdicted`)
    } catch {
      // ignore
    }
  }
  const doneSlugs = new Set(prior.map((r) => r.slug))
  const pending = allInputs.filter((t) => !doneSlugs.has(t.slug))
  console.log(`[recheck] ${pending.length} to re-check (concurrency=${concurrencyFlag}, batch=${BATCH_SIZE})`)
  if (pending.length === 0) {
    console.log('[recheck] nothing to do')
    summarize(prior)
    return
  }

  const batches: FullToolRow[][] = []
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE))
  }

  const results: RecheckRow[] = [...prior]
  let nextBatch = 0
  let processed = 0
  let failed = 0

  async function worker() {
    while (true) {
      const idx = nextBatch++
      if (idx >= batches.length) return
      const batch = batches[idx]
      try {
        const decisions = await recheckBatch(batch, priorRationale)
        results.push(...decisions)
        processed += decisions.length
        const keeps = decisions.filter((d) => d.verdict === 'keep').length
        console.log(
          `[recheck] batch ${idx + 1}/${batches.length} — ${processed}/${pending.length} done (+${keeps} keep)`,
        )
        writeFileSync(
          OUT_PATH,
          JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
        )
      } catch (e) {
        failed += batch.length
        console.error(`[recheck] batch ${idx + 1} failed: ${(e as Error).message}`)
      }
    }
  }

  const workers = Array.from({ length: concurrencyFlag }, () => worker())
  await Promise.all(workers)

  summarize(results)
  if (failed > 0) console.error(`[recheck] failed: ${failed} tools — re-run with --resume to retry`)
}

function summarize(results: RecheckRow[]) {
  const keep = results.filter((r) => r.verdict === 'keep')
  const del = results.filter((r) => r.verdict === 'delete')
  console.log(`\n[recheck] verdicts — keep=${keep.length}, delete=${del.length}, total=${results.length}`)
  console.log(`[recheck] wrote → ${OUT_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
