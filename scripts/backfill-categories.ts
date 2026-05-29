/**
 * Backfill categories for published tools that have NO tool_categories row.
 *
 * A tool with zero category rows appears on no /categories/<slug> page —
 * an SEO/discovery gap. This script asks DeepSeek (per project convention:
 * DeepSeek for backfill/SEO synthesis, Anthropic only for /plan flow) to map
 * each uncategorized tool to 1–3 of the FIXED 15 category slugs, then inserts
 * (tool_id, category_id) rows.
 *
 * Idempotent: only ever targets tools that STILL have zero categories, and
 * re-checks per-tool right before insert. Never modifies any tools.* field.
 *
 * Run: npx tsx --env-file=.env.local scripts/backfill-categories.ts
 */

import { getAdminClient } from '@/lib/cron/supabase-admin'

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'
const BATCH_SIZE = 10 // tools per DeepSeek call

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

/** All published tool ids that currently have at least one category row. */
async function loadCategorizedToolIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('tool_categories')
      .select('tool_id')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`load tool_categories: ${error.message}`)
    if (!data || data.length === 0) break
    for (const row of data as Array<{ tool_id: string }>) ids.add(row.tool_id)
    if (data.length < PAGE) break
    from += PAGE
  }
  return ids
}

/** Published tools with no category row. */
async function loadUncategorizedTools(): Promise<Tool[]> {
  const categorized = await loadCategorizedToolIds()
  const out: Tool[] = []
  let from = 0
  const PAGE = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, tagline, description')
      .eq('is_published', true)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`load tools: ${error.message}`)
    if (!data || data.length === 0) break
    for (const t of data as unknown as Tool[]) {
      if (!categorized.has(t.id)) out.push(t)
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return out
}

async function classifyBatch(
  tools: Tool[],
  validSlugs: Set<string>,
  categories: Category[],
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>()

  const categoryList = categories
    .map((c) => `- ${c.slug}: ${c.name} — ${c.description ?? ''}`)
    .join('\n')

  const toolList = tools
    .map(
      (t, i) =>
        `${i + 1}. id="${t.id}" name="${t.name}"\n   tagline: ${t.tagline ?? ''}\n   description: ${(t.description ?? '').slice(0, 600)}`,
    )
    .join('\n\n')

  const systemPrompt = `You are a precise classifier for an AI-tool decision engine. Map each tool to the 1–3 categories from a FIXED list that best describe its primary purpose. Pick the most specific applicable categories; do not over-assign. Use ONLY slugs from the provided list — never invent slugs. Return STRICT JSON only.`

  const userPrompt = `The 15 valid categories (slug: name — description):
${categoryList}

Classify each of these tools. For each, choose 1–3 category SLUGS from the list above that best fit its core function.

Tools:
${toolList}

Return a STRICT JSON object of this exact shape (no markdown, no prose):
{
  "assignments": [
    { "id": "<tool id exactly as given>", "slugs": ["<valid-slug>", ...] }
  ]
}
Rules:
- "slugs" must contain 1 to 3 entries, each EXACTLY one of the 15 valid slugs above.
- Include every tool id exactly once.
- No commentary, valid JSON only.`

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
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`DeepSeek API ${res.status} — ${body.slice(0, 200)}`)
  }

  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  const text = json.choices[0]?.message?.content ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('DeepSeek returned no JSON object')

  let parsed: { assignments?: Array<{ id?: string; slugs?: unknown }> }
  try {
    parsed = JSON.parse(match[0])
  } catch {
    const sanitized = match[0]
      .replace(/[\x00-\x1f\x7f]/g, ' ')
      .replace(/,\s*([}\]])/g, '$1')
    parsed = JSON.parse(sanitized)
  }

  const validToolIds = new Set(tools.map((t) => t.id))
  for (const a of parsed.assignments ?? []) {
    if (!a.id || !validToolIds.has(a.id)) continue
    if (!Array.isArray(a.slugs)) continue
    const slugs = Array.from(
      new Set(
        a.slugs.filter((s): s is string => typeof s === 'string' && validSlugs.has(s)),
      ),
    ).slice(0, 3)
    if (slugs.length > 0) result.set(a.id, slugs)
  }
  return result
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY missing')
  }

  console.log('[backfill-categories] loading categories…')
  const { data: catData, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug, description')
  if (catErr) throw new Error(`load categories: ${catErr.message}`)
  const categories = (catData ?? []) as unknown as Category[]
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]))
  const validSlugs = new Set(categories.map((c) => c.slug))
  console.log(`[backfill-categories] ${categories.length} categories: ${[...validSlugs].join(', ')}`)

  const tools = await loadUncategorizedTools()
  console.log(`[backfill-categories] ${tools.length} published tools with NO category`)
  if (tools.length === 0) {
    console.log('[backfill-categories] nothing to do.')
    return
  }

  let processed = 0
  let rowsInserted = 0
  let toolsCategorized = 0
  const skipped: Array<{ id: string; name: string; reason: string }> = []
  const examples: Array<{ name: string; slugs: string[] }> = []

  for (let i = 0; i < tools.length; i += BATCH_SIZE) {
    const batch = tools.slice(i, i + BATCH_SIZE)
    const batchNo = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(tools.length / BATCH_SIZE)
    console.log(`[backfill-categories] batch ${batchNo}/${totalBatches} (${batch.length} tools)…`)

    let assignments: Map<string, string[]>
    try {
      assignments = await classifyBatch(batch, validSlugs, categories)
    } catch (e) {
      console.error(`  ! batch ${batchNo} classify failed: ${e instanceof Error ? e.message : e}`)
      for (const t of batch) skipped.push({ id: t.id, name: t.name, reason: 'classify error' })
      continue
    }

    for (const tool of batch) {
      processed++
      const slugs = assignments.get(tool.id)
      if (!slugs || slugs.length === 0) {
        skipped.push({ id: tool.id, name: tool.name, reason: 'no valid slugs returned' })
        continue
      }

      // Idempotency re-check: ensure this tool STILL has zero categories.
      const { count, error: cntErr } = await supabase
        .from('tool_categories')
        .select('tool_id', { count: 'exact', head: true })
        .eq('tool_id', tool.id)
      if (cntErr) {
        skipped.push({ id: tool.id, name: tool.name, reason: `recheck error: ${cntErr.message}` })
        continue
      }
      if ((count ?? 0) > 0) {
        skipped.push({ id: tool.id, name: tool.name, reason: 'already categorized (race)' })
        continue
      }

      const rows = slugs
        .map((s) => slugToId.get(s))
        .filter((id): id is string => Boolean(id))
        .map((category_id) => ({ tool_id: tool.id, category_id }))

      if (rows.length === 0) {
        skipped.push({ id: tool.id, name: tool.name, reason: 'slugs did not map to ids' })
        continue
      }

      const { error: insErr } = await supabase
        .from('tool_categories')
        .upsert(rows as never, { onConflict: 'tool_id,category_id', ignoreDuplicates: true })
      if (insErr) {
        skipped.push({ id: tool.id, name: tool.name, reason: `insert error: ${insErr.message}` })
        continue
      }

      rowsInserted += rows.length
      toolsCategorized++
      if (examples.length < 8) examples.push({ name: tool.name, slugs })
    }
  }

  console.log('\n──────────────────────────────────────────')
  console.log('[backfill-categories] SUMMARY')
  console.log(`  tools processed:    ${processed}`)
  console.log(`  tools categorized:  ${toolsCategorized}`)
  console.log(`  rows inserted:      ${rowsInserted}`)
  console.log(`  skipped:            ${skipped.length}`)
  if (examples.length > 0) {
    console.log('  examples:')
    for (const ex of examples) console.log(`    - ${ex.name} → ${ex.slugs.join(', ')}`)
  }
  if (skipped.length > 0) {
    console.log('  skipped detail:')
    for (const s of skipped.slice(0, 25)) console.log(`    - ${s.name}: ${s.reason}`)
    if (skipped.length > 25) console.log(`    …+${skipped.length - 25} more`)
  }
  console.log('──────────────────────────────────────────\n')
}

main().catch((err) => {
  console.error('[backfill-categories] fatal:', err)
  process.exit(1)
})
