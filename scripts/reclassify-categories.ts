/**
 * Phase 11 (2026-06-20) — RE-classify categories for the WHOLE published catalog.
 *
 * Unlike scripts/backfill-categories.ts (which only fills tools that have ZERO
 * categories), this re-runs the classifier over EVERY published tool using the
 * sharpened shared rules (lib/cron/categorize-rules.ts) and REPLACES a tool's
 * category set only when it actually changes. This is the corrective pass that
 * cleans up the mis-buckets the bare-slug prompt produced (radiology + LLM
 * leaderboards in image-generation, video generators in image-generation,
 * a parked domain in healthcare, the bloated catch-alls, etc.).
 *
 * Diff semantics: compare the NEW slug set against the CURRENT slug set. If equal,
 * skip (no write). If different, in --apply we delete the tool's existing
 * tool_categories rows and insert the new ones in a single swap.
 *
 *   Dry run (default): npx tsx --env-file=.env.local scripts/reclassify-categories.ts
 *   Apply:             npx tsx --env-file=.env.local scripts/reclassify-categories.ts --apply
 *   Limit (pilot):     ... scripts/reclassify-categories.ts --limit=50
 *
 * Logs one row to pipeline_runs (pipeline_key=reclassify-categories).
 */

import { getAdminClient } from '@/lib/cron/supabase-admin'
import {
  CATEGORIZE_SYSTEM_PROMPT,
  CATEGORIZE_RULES,
  renderCategoryList,
} from '@/lib/cron/categorize-rules'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'
const BATCH_SIZE = 10

const APPLY = process.argv.includes('--apply')
const LIMIT = (() => {
  const a = process.argv.find((x) => x.startsWith('--limit='))
  return a ? parseInt(a.split('=')[1], 10) || 0 : 0
})()

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}
interface Tool {
  id: string
  name: string
  tagline: string | null
  description: string | null
}

const supabase = getAdminClient()

/** All published tools (id, name, tagline, description). */
async function loadPublishedTools(): Promise<Tool[]> {
  const out: Tool[] = []
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, tagline, description')
      .eq('is_published', true)
      .order('view_count', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`load tools: ${error.message}`)
    if (!data || data.length === 0) break
    out.push(...(data as unknown as Tool[]))
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

/** Map tool_id → current Set<slug>. */
async function loadCurrentAssignments(slugById: Map<string, string>): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('tool_categories')
      .select('tool_id, category_id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`load tool_categories: ${error.message}`)
    if (!data || data.length === 0) break
    for (const row of data as Array<{ tool_id: string; category_id: string }>) {
      const slug = slugById.get(row.category_id)
      if (!slug) continue
      if (!map.has(row.tool_id)) map.set(row.tool_id, new Set())
      map.get(row.tool_id)!.add(slug)
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return map
}

async function classifyBatch(
  tools: Tool[],
  validSlugs: Set<string>,
  categories: Category[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()

  const toolList = tools
    .map(
      (t, i) =>
        `${i + 1}. id="${t.id}" name="${t.name}"\n   tagline: ${t.tagline ?? ''}\n   description: ${(t.description ?? '').slice(0, 600)}`,
    )
    .join('\n\n')

  const userPrompt = `${CATEGORIZE_RULES}

Valid categories (use ONLY these slugs):
${renderCategoryList(categories)}

Classify each tool below.

Tools:
${toolList}

Return STRICT JSON (no markdown, no prose):
{
  "assignments": [
    { "id": "<tool id exactly as given>", "slugs": ["primary-slug", ...] }
  ]
}
- "slugs": ordered by relevance, primary first; 1 slug for a focused tool, more only for genuinely multi-domain tools.
- Use an EMPTY array for anything that is not a real working AI tool (parked domain, "for sale" page).
- Include every tool id exactly once. Valid JSON only.`

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      max_tokens: 4096,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CATEGORIZE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DeepSeek API ${res.status} — ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  }
  const text = json.choices[0]?.message?.content ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('DeepSeek returned no JSON object')

  let parsed: { assignments?: Array<{ id?: string; slugs?: unknown }> }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    parsed = JSON.parse(match[0].replace(/[\x00-\x1f\x7f]/g, ' ').replace(/,\s*([}\]])/g, '$1'))
  }

  const validToolIds = new Set(tools.map((t) => t.id))
  for (const a of parsed.assignments ?? []) {
    if (!a.id || !validToolIds.has(a.id)) continue
    if (!Array.isArray(a.slugs)) continue
    const slugs = Array.from(
      new Set(a.slugs.filter((s): s is string => typeof s === 'string' && validSlugs.has(s))),
    ).slice(0, 3)
    // An explicitly empty array (non-tool) is a valid, meaningful answer — keep it.
    result.set(a.id, slugs)
  }
  // Token usage piggy-backed onto the map via a side channel.
  ;(result as unknown as { _usage?: { in: number; out: number } })._usage = {
    in: json.usage?.prompt_tokens ?? 0,
    out: json.usage?.completion_tokens ?? 0,
  }
  return result
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY missing')

  console.log('[reclassify] loading categories…')
  const { data: catData, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug, description')
  if (catErr) throw new Error(`load categories: ${catErr.message}`)
  const categories = (catData ?? []) as unknown as Category[]
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]))
  const slugById = new Map(categories.map((c) => [c.id, c.slug]))
  const validSlugs = new Set(categories.map((c) => c.slug))

  let tools = await loadPublishedTools()
  if (LIMIT > 0) tools = tools.slice(0, LIMIT)
  const current = await loadCurrentAssignments(slugById)
  console.log(`[reclassify] ${tools.length} published tools${LIMIT ? ` (limited to ${LIMIT})` : ''} — mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`)

  let processed = 0
  let changed = 0
  let cleared = 0 // tools whose categories were emptied (non-tools)
  let unchanged = 0
  let failed = 0
  let tokIn = 0
  let tokOut = 0
  const examples: string[] = []

  for (let i = 0; i < tools.length; i += BATCH_SIZE) {
    const batch = tools.slice(i, i + BATCH_SIZE)
    const batchNo = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(tools.length / BATCH_SIZE)

    let assignments: Map<string, string[]>
    try {
      assignments = await classifyBatch(batch, validSlugs, categories)
    } catch (e) {
      console.error(`  ! batch ${batchNo}/${totalBatches} failed: ${e instanceof Error ? e.message : e}`)
      failed += batch.length
      continue
    }
    const usage = (assignments as unknown as { _usage?: { in: number; out: number } })._usage
    if (usage) { tokIn += usage.in; tokOut += usage.out }

    for (const tool of batch) {
      processed++
      if (!assignments.has(tool.id)) { failed++; continue }
      const newSlugs = assignments.get(tool.id)!
      const newSet = new Set(newSlugs)
      const curSet = current.get(tool.id) ?? new Set<string>()

      if (setsEqual(newSet, curSet)) { unchanged++; continue }

      // It changed.
      const before = [...curSet].join(',') || '∅'
      const after = newSlugs.join(',') || '∅'
      if (examples.length < 25) examples.push(`${tool.name}: [${before}] → [${after}]`)
      if (newSlugs.length === 0) cleared++

      if (APPLY) {
        // Swap: delete old rows, insert new.
        const { error: delErr } = await supabase
          .from('tool_categories')
          .delete()
          .eq('tool_id', tool.id)
        if (delErr) { console.error(`  ! delete ${tool.name}: ${delErr.message}`); failed++; continue }
        const rows = newSlugs
          .map((s) => slugToId.get(s))
          .filter((id): id is string => Boolean(id))
          .map((category_id) => ({ tool_id: tool.id, category_id }))
        if (rows.length > 0) {
          const { error: insErr } = await supabase
            .from('tool_categories')
            .upsert(rows as never, { onConflict: 'tool_id,category_id', ignoreDuplicates: true })
          if (insErr) { console.error(`  ! insert ${tool.name}: ${insErr.message}`); failed++; continue }
        }
      }
      changed++
    }
    if (batchNo % 10 === 0 || batchNo === totalBatches) {
      console.log(`[reclassify] batch ${batchNo}/${totalBatches} — changed=${changed} unchanged=${unchanged} cleared=${cleared} failed=${failed}`)
    }
  }

  const costUsd = (tokIn / 1e6) * 0.27 + (tokOut / 1e6) * 1.1
  console.log('\n──────────────────────────────────────────')
  console.log(`[reclassify] SUMMARY${APPLY ? '' : ' (DRY RUN — no writes)'}`)
  console.log(`  processed:  ${processed}`)
  console.log(`  changed:    ${changed}`)
  console.log(`  cleared (non-tool → no category): ${cleared}`)
  console.log(`  unchanged:  ${unchanged}`)
  console.log(`  failed:     ${failed}`)
  console.log(`  tokens:     in=${tokIn} out=${tokOut}  (~$${costUsd.toFixed(2)})`)
  console.log('  sample changes:')
  for (const ex of examples) console.log(`    - ${ex}`)
  console.log('──────────────────────────────────────────\n')

  // NOTE: this is a MANUAL, one-off corrective pass — not a recurring pipeline —
  // so it deliberately does NOT write to `pipeline_runs` (whose `source` is
  // constrained to vercel_cron/gh_actions for scheduled jobs). The console
  // summary above + the Phase 11 build log are this run's record. New tools are
  // kept correct going forward by the live onboarding path (lib/cron/onboard.ts).
}

main().catch((err) => {
  console.error('[reclassify] fatal:', err)
  process.exit(1)
})
