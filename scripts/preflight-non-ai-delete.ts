/**
 * Phase 9 Day-4 (2026-05-29) — Pre-flight summary for the non-AI hard-delete.
 *
 * Reads candidates/non-ai-audit.json, looks up which slugs actually exist in
 * the catalog, counts the cascade impact (compares + mentions), and prints
 * a human-readable summary. Does NOT modify anything.
 *
 * USAGE: npm run preflight:non-ai
 */
export {}

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

type Decision = {
  slug: string
  name: string
  classification: 'ai_native' | 'ai_enabled' | 'non_ai'
  rationale: string
  categories: string[]
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('missing Supabase env')
  const supa = createClient(supabaseUrl, supabaseKey)

  const audit = JSON.parse(readFileSync(resolve(process.cwd(), 'candidates/non-ai-audit.json'), 'utf-8')) as {
    decisions: Decision[]
  }
  const nonAi = audit.decisions.filter((d) => d.classification === 'non_ai')
  const slugs = nonAi.map((d) => d.slug)
  console.log(`[preflight] audit flagged ${nonAi.length} tools as non_ai`)

  // 1. Tools currently in catalog
  const { data: present, error: e1 } = await supa
    .from('tools')
    .select('id, slug, name, view_count, is_published')
    .in('slug', slugs)
  if (e1) throw new Error(`tools lookup: ${e1.message}`)
  const presentRows = present ?? []
  const presentSlugs = new Set(presentRows.map((r) => r.slug))
  const presentIds = presentRows.map((r) => r.id)
  console.log(`[preflight] ${presentRows.length}/${nonAi.length} are still in the catalog`)
  console.log(`[preflight] ${presentRows.filter((r) => r.is_published).length} are currently published`)

  // 2. Tools NOT in catalog (already removed earlier)
  const missing = slugs.filter((s) => !presentSlugs.has(s))
  if (missing.length > 0) {
    console.log(`[preflight] ${missing.length} slugs already absent — first 5: ${missing.slice(0, 5).join(', ')}`)
  }

  // 3. tool_comparisons that reference any of these IDs
  const { data: comparesAll, error: e2 } = await supa
    .from('tool_comparisons')
    .select('id, slug, tool_ids, view_count')
    .limit(10000)
  if (e2) throw new Error(`compares lookup: ${e2.message}`)
  const presentIdSet = new Set(presentIds)
  const compareHits = (comparesAll ?? []).filter((c) =>
    Array.isArray(c.tool_ids) && c.tool_ids.some((id: string) => presentIdSet.has(id)),
  )
  console.log(`[preflight] ${compareHits.length} editorial compares will be removed (reference a non-AI tool)`)

  // 4. Top affected by view_count
  const topTools = [...presentRows].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 15)
  console.log('\n[preflight] Top 15 by view_count that will be hard-deleted:')
  for (const t of topTools) {
    const dec = nonAi.find((d) => d.slug === t.slug)
    console.log(`  - ${t.slug.padEnd(30)} views=${(t.view_count ?? 0).toString().padStart(6)}  ${dec?.rationale ?? ''}`)
  }

  // 5. Category breakdown
  const catCount = new Map<string, number>()
  for (const d of nonAi) {
    if (!presentSlugs.has(d.slug)) continue
    const cats = d.categories.length > 0 ? d.categories : ['<uncategorized>']
    for (const c of cats) catCount.set(c, (catCount.get(c) ?? 0) + 1)
  }
  const sorted = [...catCount.entries()].sort((a, b) => b[1] - a[1])
  console.log('\n[preflight] Top categories among non-AI tools (top 12):')
  for (const [cat, n] of sorted.slice(0, 12)) {
    console.log(`  ${cat.padEnd(30)} ${n}`)
  }

  // 6. Top compares by view_count that will die
  const topCompares = [...compareHits].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 10)
  console.log('\n[preflight] Top 10 editorial compares by view_count being removed:')
  for (const c of topCompares) {
    console.log(`  - /compare/${c.slug.padEnd(50)} views=${c.view_count ?? 0}`)
  }

  console.log('\n[preflight] Done. No changes made.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
