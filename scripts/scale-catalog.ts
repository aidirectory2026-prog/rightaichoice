/**
 * Step 41 — bulk catalog scale-up runner.
 *
 * Two discovery modes:
 *   1. Default — runs the existing cron discover/dedup/enrich pipeline.
 *      (Currently gets HTTP 403 on ProductHunt + TAAFT; see --seed-file path.)
 *   2. `--seed-file=<path>` — reads a JSON array of candidates with
 *      discovery-time signals pre-attached. Use this with the Apify-sourced
 *      seed produced out-of-band (candidates/*.json) to bypass the 403s.
 *
 * Each candidate runs through: enrich → predict-categories → curate
 * (plan §41 ≥3 of 5 gate) → category-rebalance → SQL write.
 *
 * Does NOT write to the DB. Operator reviews the generated .sql, then
 * runs `supabase db push` to ship the batch.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/scale-catalog.ts \
 *     --seed-file=candidates/batch19.json --target=200 --batch=19 --file-num=039
 *
 * Flags:
 *   --target      survivor cap (default 200)
 *   --batch       batch number, drives file name (default 19)
 *   --file-num    migration number prefix override (default computed)
 *   --seed-file   path to JSON seed (skips built-in discovery)
 *   --concurrency parallel enrich workers (default 3)
 *   --dry-run     print summary, don't write migration
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */
export {}

import { writeFile, readFile } from 'node:fs/promises'
import { z } from 'zod'
import { getAdminClient } from '../lib/cron/supabase-admin'
import { discoverTools } from '../lib/cron/discover'
import { dedup } from '../lib/cron/dedup'
import { enrichTool, type EnrichedToolData } from '../lib/cron/enrich'

// Phase 8.h (2026-05-25) — switched off Anthropic per user memory rule.
// DeepSeek is used for both enrichment (lib/cron/enrich.ts) and category
// prediction below. Anthropic import + getAnthropicClient call removed.
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_CATEGORY_MODEL = 'deepseek-chat'
import {
  loadCurateContext,
  curateCandidate,
  type CandidateSignals,
} from '../lib/cron/curate'

const categorySchema = z.object({
  slugs: z.array(z.string()).min(1).max(3),
})

const seedSchema = z.array(
  z.object({
    name: z.string().min(1),
    url: z.string().url(),
    description: z.string().default(''),
    source: z.string().default('seed'),
    signals: z
      .object({
        recentList: z.boolean().optional(),
        githubStars: z.number().optional(),
        githubStarsMoM: z.number().optional(),
        fundingMentioned: z.boolean().optional(),
        trafficTrend: z.enum(['up', 'flat', 'down']).nullable().optional(),
        usageSignal: z
          .object({
            reviewCount: z.number().optional(),
            rating: z.number().optional(),
            redditThreads: z.number().optional(),
            userCountClaim: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
)

type SeedCandidate = z.infer<typeof seedSchema>[number]

function argValue(flag: string, fallback: string): string {
  const arg = process.argv.find((a) => a.startsWith(`${flag}=`))
  return arg ? arg.split('=')[1] : fallback
}

async function fetchCategorySlugs(supabase: ReturnType<typeof getAdminClient>): Promise<string[]> {
  const { data, error } = await supabase.from('categories').select('slug').order('slug')
  if (error) throw error
  return ((data ?? []) as { slug: string }[]).map((c) => c.slug).filter(Boolean)
}

async function predictCategories(
  name: string,
  enriched: EnrichedToolData,
  validSlugs: string[],
): Promise<string[]> {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error(`[predict-cat] ${name} — DEEPSEEK_API_KEY missing`)
    return []
  }
  const prompt = `Pick 1-3 category slugs for this AI tool. Return ONLY slugs from the provided list — never invent.

Tool: ${name}
Tagline: ${enriched.tagline}
Description: ${enriched.description.slice(0, 800)}
Features: ${(enriched.features ?? []).slice(0, 8).join(', ')}
Best for: ${(enriched.best_for ?? []).slice(0, 5).join(', ')}

Valid category slugs (pick from these only):
${validSlugs.join(', ')}

Return JSON: {"slugs": ["slug-1", "slug-2"]}`

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_CATEGORY_MODEL,
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You assign categories to AI tools. Reply with strict JSON only.' },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[predict-cat] ${name} — DeepSeek ${res.status}: ${body.slice(0, 200)}`)
      return []
    }
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
    const text = json.choices[0]?.message?.content ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return []
    const parsed = categorySchema.parse(JSON.parse(match[0]))
    return parsed.slugs.filter((s) => validSlugs.includes(s))
  } catch (e) {
    console.error(`[predict-cat] ${name} —`, (e as Error).message)
    return []
  }
}

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''")
}

function pgArray(items: string[]): string {
  if (items.length === 0) return '{}'
  // 1) escape backslashes + double-quotes for PG array literal syntax
  // 2) escape apostrophes to '' because the literal is wrapped in a SQL single-quoted string
  const escaped = items.map(
    (s) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "''")}"`,
  )
  return `{${escaped.join(',')}}`
}

function sqlNullableText(value: string | null | undefined): string {
  if (value == null || value === '') return 'NULL'
  return `'${sqlEscape(value)}'`
}

interface Survivor {
  name: string
  slug: string
  url: string
  enriched: EnrichedToolData
  categorySlugs: string[]
  source: string
  viability: number
  criteriaPassed: number
}

/**
 * Plan §41 step 5 — category rebalance. Enforce "no single category exceeds
 * 15% of post-batch total." Counts: existing catalog + this batch's
 * survivors' primary-category assignments. If any category would exceed the
 * cap, drop the lowest-viability survivors whose primary category is the
 * over-represented one until within cap. Returns filtered survivors.
 */
function rebalanceCategories(
  survivors: Survivor[],
  existingCategoryCounts: Map<string, number>,
  existingTotal: number,
  maxShare: number = 0.15,
): Survivor[] {
  if (survivors.length === 0) return survivors

  const primaryCat = (s: Survivor): string | null => s.categorySlugs[0] ?? null

  // Projected counts = existing + batch primary-category tallies
  const projected = new Map(existingCategoryCounts)
  for (const s of survivors) {
    const pc = primaryCat(s)
    if (pc) projected.set(pc, (projected.get(pc) ?? 0) + 1)
  }
  const projectedTotal = () => existingTotal + kept.length

  // Keep all by default, then drop as needed per over-capped category
  let kept = [...survivors]
  const initialCount = kept.length
  let dropped = 0

  const catOverCap = (): string | null => {
    const total = projectedTotal()
    if (total === 0) return null
    for (const [cat, cnt] of projected.entries()) {
      if (cnt / total > maxShare) return cat
    }
    return null
  }

  while (true) {
    const over = catOverCap()
    if (!over) break
    // Drop the lowest-viability survivor whose primary cat is the over-capped one
    const overIdx = kept
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => primaryCat(s) === over)
      .sort((a, b) => a.s.viability - b.s.viability)
    if (overIdx.length === 0) break
    const drop = overIdx[0]
    kept.splice(drop.i, 1)
    projected.set(over, (projected.get(over) ?? 1) - 1)
    dropped++
  }

  if (dropped > 0) {
    console.log(`[rebalance] dropped ${dropped} of ${initialCount} survivors to keep every category ≤${(maxShare * 100).toFixed(0)}% of total`)
  } else {
    console.log(`[rebalance] ok — all categories within ${(maxShare * 100).toFixed(0)}% cap`)
  }
  return kept
}

function buildMigrationSql(batchNum: number, survivors: Survivor[]): string {
  const header = `-- ============================================================
-- Batch ${batchNum}: ${survivors.length} curated AI tools (Step 41 — scale to 1,500)
-- Generated by scripts/scale-catalog.ts. Each tool passed the plan §41 gate
-- (≥3 of 5 criteria: trending, growing, in-use, category-gap, viability≥30)
-- and the post-batch category-rebalance pass (no cat >15% of total).
-- ============================================================

INSERT INTO tools (
  name, slug, tagline, description, website_url,
  pricing_type, pricing_details, skill_level, has_api, platforms,
  features, integrations, is_published,
  best_for, not_for, editorial_verdict,
  tutorial_urls, limitations, models, community_links, use_cases, our_views,
  latest_updates, latest_updates_at,
  last_verified_at
) VALUES`

  const rows = survivors.map((s) => {
    const e = s.enriched
    return `(${[
      `'${sqlEscape(s.name)}'`,
      `'${sqlEscape(s.slug)}'`,
      `'${sqlEscape(e.tagline)}'`,
      `'${sqlEscape(e.description)}'`,
      `'${sqlEscape(s.url)}'`,
      `'${e.pricing_type}'`,
      `'${sqlEscape(JSON.stringify(e.pricing_details ?? []))}'::jsonb`,
      `'${e.skill_level}'`,
      e.has_api ? 'true' : 'false',
      `'${pgArray(e.platforms ?? [])}'`,
      `'${pgArray(e.features ?? [])}'`,
      `'${pgArray(e.integrations ?? [])}'`,
      'true',
      `'${pgArray(e.best_for ?? [])}'`,
      `'${pgArray(e.not_for ?? [])}'`,
      `'${sqlEscape(e.editorial_verdict ?? '')}'`,
      `'${pgArray(e.tutorial_urls ?? [])}'`,
      sqlNullableText(e.limitations),
      `'${pgArray(e.models ?? [])}'`,
      `'${sqlEscape(JSON.stringify(e.community_links ?? {}))}'::jsonb`,
      `'${pgArray(e.use_cases ?? [])}'`,
      sqlNullableText(e.our_views),
      `'${sqlEscape(JSON.stringify(e.latest_updates ?? []))}'::jsonb`,
      // Anti-starvation: leave latest_updates_at + last_verified_at NULL so
      // the stalest-first pipelines (ORDER BY ... ASC NULLS FIRST) pick these
      // bulk-inserted tools up FIRST. onboarded_at also defaults NULL → the
      // fast onboard orchestrator reaches them within ~30 min.
      'NULL',
      'NULL',
    ].join(', ')})`
  })

  const insertBlock = `${header}\n${rows.join(',\n')}\nON CONFLICT (slug) DO NOTHING;\n`

  const catRows: string[] = []
  for (const s of survivors) {
    for (const catSlug of s.categorySlugs) {
      catRows.push(
        `INSERT INTO tool_categories (tool_id, category_id) SELECT t.id, c.id FROM tools t, categories c WHERE t.slug = '${sqlEscape(s.slug)}' AND c.slug = '${sqlEscape(catSlug)}' ON CONFLICT DO NOTHING;`,
      )
    }
  }

  return `${insertBlock}\n-- Category assignments\n${catRows.join('\n')}\n`
}

async function loadSeedCandidates(path: string): Promise<SeedCandidate[]> {
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw)
  return seedSchema.parse(parsed)
}

async function main() {
  const target = Number(argValue('--target', '200'))
  const batchNum = Number(argValue('--batch', '19'))
  const concurrency = Number(argValue('--concurrency', '3'))
  const seedFile = argValue('--seed-file', '')
  const dryRun = process.argv.includes('--dry-run')

  const supabase = getAdminClient()

  console.log(`[scale] target=${target} batch=${batchNum} concurrency=${concurrency} dryRun=${dryRun} seedFile=${seedFile || '(none — using discoverTools)'}`)

  // 1. Candidate sourcing — seed-file or built-in discovery
  let candidates: Array<{
    name: string
    url: string
    description: string
    source: string
    signals?: CandidateSignals
  }>

  if (seedFile) {
    console.log('[scale] loading candidates from seed file…')
    const seed = await loadSeedCandidates(seedFile)
    candidates = seed.map((s) => ({
      name: s.name,
      url: s.url,
      description: s.description,
      source: s.source,
      signals: s.signals,
    }))
    console.log(`[scale]   ${candidates.length} candidates loaded from ${seedFile}`)
  } else {
    console.log('[scale] discovering candidates via built-in sources…')
    const raw = await discoverTools()
    console.log(`[scale]   discovered ${raw.length} raw`)
    console.log('[scale] dedupe against existing tools…')
    const unique = await dedup(raw, supabase)
    console.log(`[scale]   ${unique.length} unique after dedup`)
    candidates = unique.map((t) => ({
      name: t.name,
      url: t.url,
      description: t.description,
      source: t.source,
      // Built-in sources are all recency lists → tag trending
      signals: { recentList: true },
    }))
  }

  // 2. Dedup seed-file candidates against existing slugs (seed flow skips
  //    the DB dedup pass above)
  console.log('[scale] loading curation context + categories…')
  const [curateCtx, validSlugs] = await Promise.all([
    loadCurateContext(supabase),
    fetchCategorySlugs(supabase),
  ])
  console.log(`[scale]   existing tools=${curateCtx.existingSlugs.size} · valid categories=${validSlugs.length} · required criteria=${curateCtx.minCriteria}/5`)

  // 3. Enrich → predict categories → curate gate
  const survivors: Survivor[] = []
  let attempted = 0
  let enrichFailed = 0
  let gated = 0

  outer: for (let i = 0; i < candidates.length; i += concurrency) {
    if (survivors.length >= target) break
    const batch = candidates.slice(i, i + concurrency)
    const enrichedBatch = await Promise.all(
      batch.map(async (tool) => {
        attempted++
        const enriched = await enrichTool(tool.name, tool.url, tool.description)
        return { tool, enriched }
      }),
    )

    for (const { tool, enriched } of enrichedBatch) {
      if (survivors.length >= target) break outer
      if (!enriched) {
        enrichFailed++
        continue
      }
      // Predict categories first — needed for category-gap criterion
      const cats = await predictCategories(tool.name, enriched, validSlugs)
      const decision = curateCandidate(
        {
          name: tool.name,
          websiteUrl: tool.url,
          enriched,
          signals: tool.signals,
          predictedCategories: cats,
        },
        curateCtx,
      )
      if (!decision.pass) {
        gated++
        console.log(`[gate] ${tool.name} — ${decision.reasons.join(',')} (criteria=${decision.criteriaPassed}/5)`)
        continue
      }
      survivors.push({
        name: tool.name,
        slug: decision.slug,
        url: tool.url,
        enriched,
        categorySlugs: cats,
        source: tool.source,
        viability: decision.viabilityProxy,
        criteriaPassed: decision.criteriaPassed,
      })
      curateCtx.existingSlugs.add(decision.slug)
      console.log(`[ok ${survivors.length}/${target}] ${tool.name} · criteria=${decision.criteriaPassed}/5 · viability=${decision.viabilityProxy} · cats=[${cats.join(',') || 'none'}]`)
    }
  }

  console.log(`[scale] discovery+gate done. attempted=${attempted} enrichFailed=${enrichFailed} gated=${gated} survivors=${survivors.length}`)

  if (survivors.length === 0) {
    console.log('[scale] no survivors — nothing to write')
    return
  }

  // 4. Category rebalance — plan §41 step 5
  const rebalanced = rebalanceCategories(
    survivors,
    curateCtx.categoryCounts,
    curateCtx.totalTools,
    0.15,
  )

  console.log(`[scale] writing SQL for ${rebalanced.length} tools (post-rebalance)`)

  const sql = buildMigrationSql(batchNum, rebalanced)
  const fileNum = argValue('--file-num', String(37 + batchNum - 18).padStart(3, '0'))
  const fileName = `${fileNum}_seed_tools_batch${batchNum}.sql`
  const path = `supabase/migrations/${fileName}`

  if (dryRun) {
    console.log(`[scale] --dry-run · would write ${path} (${sql.length} bytes)`)
    console.log(sql.slice(0, 800))
    return
  }

  await writeFile(path, sql, 'utf8')
  console.log(`[scale] wrote ${path} (${sql.length} bytes, ${rebalanced.length} tools)`)
  console.log('[scale] next: review file, then `supabase db push` to apply')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
