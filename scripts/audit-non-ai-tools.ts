/**
 * Phase 9 Day-4 (2026-05-29) — Non-AI tool audit.
 *
 * Classifies every published tool as one of:
 *   - "ai_native"   — entire product is AI (ChatGPT, Midjourney, Cursor)
 *   - "ai_enabled"  — established product with bolted-on AI features
 *   - "non_ai"     — no meaningful AI component
 *
 * Output: candidates/non-ai-audit.json — consumed by the hard-delete script.
 *
 * Batches 25 tools per DeepSeek call for cost + latency. Resumable via
 * --resume (skips slugs already classified). Idempotent.
 *
 * USAGE:
 *   npm run audit:non-ai                  # full audit
 *   npm run audit:non-ai -- --resume      # skip already-classified
 *   npm run audit:non-ai -- --limit=200   # sample first N
 *   npm run audit:non-ai -- --concurrency=5
 *
 * REQUIRED ENV: DEEPSEEK_API_KEY, NEXT_PUBLIC_SUPABASE_URL,
 *               SUPABASE_SERVICE_ROLE_KEY
 */
export {}

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { callDeepSeek, stripJsonFences } from '../lib/plan/deepseek'

type Classification = 'ai_native' | 'ai_enabled' | 'non_ai'

type ToolRow = {
  slug: string
  name: string
  tagline: string | null
  description: string | null
  categories: string[]
}

type Decision = {
  slug: string
  name: string
  classification: Classification
  rationale: string
  categories: string[]
  decided_at: string
}

const OUT_PATH = resolve(process.cwd(), 'candidates/non-ai-audit.json')

const args = process.argv.slice(2)
const isResume = args.includes('--resume')
const limitFlag = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0', 10)
const concurrencyFlag = parseInt(
  args.find((a) => a.startsWith('--concurrency='))?.split('=')[1] ?? '3',
  10,
)
const BATCH_SIZE = 25

const SYSTEM_PROMPT = `You classify SaaS tools by their AI-nativeness.

Categories:
- "ai_native": the entire product IS AI. Without AI it would not exist. (ChatGPT, Midjourney, Cursor, Claude, Perplexity, ElevenLabs, Suno)
- "ai_enabled": established non-AI product that bolted on AI features. AI is a feature, not the product. (Notion, Figma, Canva, Asana, Salesforce, Slack, Adobe Photoshop)
- "non_ai": no meaningful AI component. AI is either absent or pure marketing veneer over a generic SaaS workflow. (Webflow, Shopify, Calendly, Stripe, QuickBooks, BambooHR, Carrd)

Rules:
- Judge by what the tool ACTUALLY does, not what its marketing claims
- A tool that says "AI-powered" but is really keyword matching, rule engines, or generic automation → non_ai
- A tool with neural backend but no user-facing AI surface → non_ai (e.g., neural recommenders)
- A search engine without AI summaries → non_ai (Kagi, Namecheap)
- A hardware product (wearable, chip) → non_ai
- A cloud infra provider (hosting, GPU rental) → non_ai
- When uncertain between ai_enabled and non_ai, choose non_ai
- When uncertain between ai_native and ai_enabled, choose ai_enabled

Output strict JSON: {"results":[{"slug":"...","classification":"ai_native|ai_enabled|non_ai","rationale":"<10 words"}]}`

function buildBatchPrompt(tools: ToolRow[]): string {
  return (
    'Classify these tools. Return JSON with one entry per tool, same order.\n\n' +
    tools
      .map((t, i) => {
        const cats = t.categories.length > 0 ? `[${t.categories.join(', ')}]` : '[uncategorized]'
        const pitch = (t.tagline || t.description || '').slice(0, 200).replace(/\n/g, ' ')
        return `${i + 1}. ${t.name} (slug=${t.slug}) ${cats} — ${pitch}`
      })
      .join('\n')
  )
}

async function classifyBatch(tools: ToolRow[]): Promise<Decision[]> {
  const raw = await callDeepSeek({
    system: SYSTEM_PROMPT,
    user: buildBatchPrompt(tools),
    max_tokens: 4096,
  })
  const clean = stripJsonFences(raw)
  const parsed = JSON.parse(clean) as { results: Array<Pick<Decision, 'slug' | 'classification' | 'rationale'>> }
  const bySlug = new Map(parsed.results.map((r) => [r.slug, r]))
  const now = new Date().toISOString()
  return tools.map((t) => {
    const hit = bySlug.get(t.slug)
    if (!hit) {
      return {
        slug: t.slug,
        name: t.name,
        classification: 'ai_enabled',
        rationale: 'classifier returned no entry for this slug',
        categories: t.categories,
        decided_at: now,
      }
    }
    return {
      slug: t.slug,
      name: t.name,
      classification: hit.classification,
      rationale: hit.rationale,
      categories: t.categories,
      decided_at: now,
    }
  })
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('missing DEEPSEEK_API_KEY')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('missing Supabase env')

  const supa = createClient(supabaseUrl, supabaseKey)
  console.log('[audit:non-ai] pulling published tools…')

  type Row = {
    slug: string
    name: string
    tagline: string | null
    description: string | null
    tool_categories: Array<{ categories: { slug: string } | null }>
  }

  // Supabase PostgREST caps at 1000 rows per request — paginate to get the full
  // catalog (~2,000+ published tools).
  const PAGE = 1000
  const tools: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supa
      .from('tools')
      .select(
        `
        slug, name, tagline, description,
        tool_categories(categories(slug))
      `,
      )
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`tools fetch (page ${from}): ${error.message}`)
    if (!data || data.length === 0) break
    tools.push(...(data as unknown as Row[]))
    if (data.length < PAGE) break
  }
  console.log(`[audit:non-ai] fetched ${tools.length} published tools`)

  const all: ToolRow[] = tools.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    description: t.description,
    categories: t.tool_categories
      .map((tc) => tc.categories?.slug)
      .filter((s): s is string => !!s),
  }))

  // Load prior results for --resume
  let prior: Decision[] = []
  if (isResume && existsSync(OUT_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(OUT_PATH, 'utf-8')) as { decisions: Decision[] }
      prior = parsed.decisions ?? []
      console.log(`[audit:non-ai] resume — ${prior.length} already classified`)
    } catch {
      // ignore
    }
  }
  const doneSlugs = new Set(prior.map((d) => d.slug))
  let pending = all.filter((t) => !doneSlugs.has(t.slug))
  if (limitFlag > 0) pending = pending.slice(0, limitFlag)

  console.log(`[audit:non-ai] ${pending.length} to classify (concurrency=${concurrencyFlag}, batch=${BATCH_SIZE})`)
  if (pending.length === 0) {
    console.log('[audit:non-ai] nothing to do')
    return
  }

  const batches: ToolRow[][] = []
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE))
  }

  const results: Decision[] = [...prior]
  let nextBatch = 0
  let processed = 0
  let failed = 0

  async function worker() {
    while (true) {
      const idx = nextBatch++
      if (idx >= batches.length) return
      const batch = batches[idx]
      try {
        const decisions = await classifyBatch(batch)
        results.push(...decisions)
        processed += decisions.length
        const nonAi = decisions.filter((d) => d.classification === 'non_ai').length
        console.log(
          `[audit:non-ai] batch ${idx + 1}/${batches.length} — ${processed}/${pending.length} done (+${nonAi} non-AI)`,
        )
        // Persist after each batch in case of crash
        writeFileSync(
          OUT_PATH,
          JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              totals: { processed: results.length, target: all.length },
              decisions: results,
            },
            null,
            2,
          ),
        )
      } catch (e) {
        failed += batch.length
        console.error(`[audit:non-ai] batch ${idx + 1} failed: ${(e as Error).message}`)
      }
    }
  }

  const workers = Array.from({ length: concurrencyFlag }, () => worker())
  await Promise.all(workers)

  const counts = {
    ai_native: results.filter((d) => d.classification === 'ai_native').length,
    ai_enabled: results.filter((d) => d.classification === 'ai_enabled').length,
    non_ai: results.filter((d) => d.classification === 'non_ai').length,
  }
  console.log(`[audit:non-ai] done. ai_native=${counts.ai_native} ai_enabled=${counts.ai_enabled} non_ai=${counts.non_ai} failed=${failed}`)
  console.log(`[audit:non-ai] wrote → ${OUT_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
