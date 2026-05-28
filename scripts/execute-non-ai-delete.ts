/**
 * Phase 9 Day-4 (2026-05-29) — Hard-delete the confirmed non-AI tools.
 *
 * Reads candidates/non-ai-recheck.json, filters verdict === 'delete', skips
 * a manual exclude list, then:
 *   1. Snapshots into deleted_tools (audit trail)
 *   2. Deletes referencing tool_comparisons rows (no FK — manual cleanup)
 *   3. Defensive: deletes page_tool_mentions rows by slug (no FK)
 *   4. Hard-deletes tools rows (cascades ~16 child tables)
 *   5. Rewrites lib/seo/deleted-tools.ts so the proxy returns 410 Gone
 *   6. Pings IndexNow with the dead URLs to accelerate deindexation
 *
 * USAGE:
 *   npm run execute:non-ai -- --dry        # show plan only
 *   npm run execute:non-ai -- --apply      # execute
 *   npm run execute:non-ai -- --apply --skip-indexnow
 */
export {}

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { submitToIndexNow } from '../lib/indexnow'

type RecheckRow = {
  slug: string
  name: string
  prior_rationale: string
  verdict: 'keep' | 'delete'
  reason: string
}

const RECHECK_PATH = resolve(process.cwd(), 'candidates/non-ai-recheck.json')
const STATIC_OUT = resolve(process.cwd(), 'lib/seo/deleted-tools.ts')

// Phase 9 Day-4 — user-approved excludes from auto-delete. These slugs the
// classifier flagged as no-AI, but they either misfired (model self-contradiction)
// or have real AI features the description doesn't reflect.
const MANUAL_EXCLUDES = new Set<string>([
  'ink-editor',          // classifier reason said "(keep)" but verdict was "delete"
  'shopify',             // Shopify Magic + Sidekick exist
  'cal-com',             // Cal.ai scheduling assistant
  'oura',                // Personalized AI insights
  'brightside-health',   // Edge case — clinical AI use cases growing
])

const args = process.argv.slice(2)
const isDry = args.includes('--dry')
const isApply = args.includes('--apply')
const skipIndexNow = args.includes('--skip-indexnow')

if (!isDry && !isApply) {
  console.error('Pass --dry or --apply')
  process.exit(1)
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) throw new Error('missing Supabase env')
  const supa = createClient(supabaseUrl, supabaseKey)

  // 1. Load recheck and filter delete list, applying manual excludes
  const recheck = JSON.parse(readFileSync(RECHECK_PATH, 'utf-8')) as { results: RecheckRow[] }
  const deleteCandidates = recheck.results.filter((r) => r.verdict === 'delete')
  const finalSlugs = deleteCandidates.filter((r) => !MANUAL_EXCLUDES.has(r.slug))
  const excluded = deleteCandidates.filter((r) => MANUAL_EXCLUDES.has(r.slug))

  console.log(`[execute] candidate count: ${deleteCandidates.length}`)
  console.log(`[execute] manual excludes: ${excluded.length} — ${excluded.map((e) => e.slug).join(', ')}`)
  console.log(`[execute] FINAL delete list: ${finalSlugs.length} tools`)

  if (finalSlugs.length === 0) {
    console.log('[execute] nothing to delete')
    return
  }

  // 2. Resolve slug → id + name + categories (joined)
  type Row = {
    id: string
    slug: string
    name: string
    tool_categories: Array<{ categories: { slug: string } | null }>
  }
  const fetched: Row[] = []
  const slugList = finalSlugs.map((r) => r.slug)
  for (let i = 0; i < slugList.length; i += 500) {
    const chunk = slugList.slice(i, i + 500)
    const { data, error } = await supa
      .from('tools')
      .select(`id, slug, name, tool_categories(categories(slug))`)
      .in('slug', chunk)
    if (error) throw new Error(`tools fetch: ${error.message}`)
    fetched.push(...((data as unknown as Row[]) ?? []))
  }
  const rowBySlug = new Map(fetched.map((r) => [r.slug, r]))
  const ids = fetched.map((r) => r.id)
  console.log(`[execute] resolved ${fetched.length}/${finalSlugs.length} slugs to tool IDs`)

  const notFoundSlugs = slugList.filter((s) => !rowBySlug.has(s))
  if (notFoundSlugs.length > 0) {
    console.warn(`[execute] ${notFoundSlugs.length} slugs not found (already removed?): ${notFoundSlugs.join(', ')}`)
  }

  // 3. Find tool_comparisons referencing any of these ids (no FK — manual cleanup)
  type CmpRow = { id: string; slug: string; tool_ids: string[] }
  const compares: CmpRow[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supa
      .from('tool_comparisons')
      .select('id, slug, tool_ids')
      .range(from, from + 999)
    if (error) throw new Error(`compares fetch: ${error.message}`)
    if (!data || data.length === 0) break
    compares.push(...(data as CmpRow[]))
    if (data.length < 1000) break
  }
  const idSet = new Set(ids)
  const compareHits = compares.filter(
    (c) => Array.isArray(c.tool_ids) && c.tool_ids.some((id) => idSet.has(id)),
  )
  console.log(`[execute] ${compareHits.length} editorial compares reference a non-AI tool`)

  if (isDry) {
    console.log('\n[execute] DRY RUN — no changes made.')
    console.log(`  Would delete ${fetched.length} tools (cascades to ~16 child tables)`)
    console.log(`  Would delete ${compareHits.length} compares`)
    console.log(`  Would insert ${fetched.length} rows into deleted_tools`)
    console.log(`  Would write ${STATIC_OUT}`)
    console.log(`  Would ping IndexNow with ${fetched.length + compareHits.length} URLs`)
    return
  }

  // === APPLY ===
  const now = new Date().toISOString()
  const reasonMap = new Map(finalSlugs.map((r) => [r.slug, r.reason]))

  // 3a. Insert into deleted_tools FIRST (upsert is idempotent)
  const auditRows = fetched.map((r) => ({
    slug: r.slug,
    name: r.name,
    reason: 'non_ai_audit',
    classification: 'non_ai',
    rationale: reasonMap.get(r.slug) ?? '',
    categories: r.tool_categories.map((tc) => tc.categories?.slug).filter((s): s is string => !!s),
    deleted_at: now,
  }))
  // Also archive the dead compares so a future audit can trace them
  const compareAuditRows = compareHits.map((c) => ({
    slug: `compare/${c.slug}`,
    name: c.slug,
    reason: 'non_ai_audit_compare',
    classification: 'compare_referencing_non_ai' as const,
    rationale: null,
    categories: [],
    deleted_at: now,
  }))

  console.log(`[execute] inserting ${auditRows.length} audit rows…`)
  const { error: insertErr } = await supa
    .from('deleted_tools')
    .upsert(auditRows, { onConflict: 'slug' })
  if (insertErr) throw new Error(`audit insert: ${insertErr.message}`)
  if (compareAuditRows.length > 0) {
    const { error: cinsErr } = await supa
      .from('deleted_tools')
      .upsert(compareAuditRows, { onConflict: 'slug' })
    if (cinsErr) throw new Error(`compare audit insert: ${cinsErr.message}`)
  }

  // 3b. Delete tool_comparisons rows (chunked for safety)
  if (compareHits.length > 0) {
    const cmpIds = compareHits.map((c) => c.id)
    for (let i = 0; i < cmpIds.length; i += 200) {
      const chunk = cmpIds.slice(i, i + 200)
      const { error } = await supa.from('tool_comparisons').delete().in('id', chunk)
      if (error) throw new Error(`compares delete (chunk ${i}): ${error.message}`)
    }
    console.log(`[execute] deleted ${cmpIds.length} compares`)
  }

  // 3c. Delete page_tool_mentions (defensive — preflight showed 0)
  const { error: pmErr, count: pmCount } = await supa
    .from('page_tool_mentions')
    .delete({ count: 'exact' })
    .in('tool_slug', slugList)
  if (pmErr) throw new Error(`page_tool_mentions delete: ${pmErr.message}`)
  console.log(`[execute] deleted ${pmCount ?? 0} page_tool_mentions rows`)

  // 3d. Hard-delete tools (cascades the 16 FK-child tables automatically)
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const { error } = await supa.from('tools').delete().in('id', chunk)
    if (error) throw new Error(`tools delete (chunk ${i}): ${error.message}`)
  }
  console.log(`[execute] hard-deleted ${ids.length} tools (with cascade)`)

  // 4. Rewrite lib/seo/deleted-tools.ts so the proxy can return 410 Gone
  const allDeletedTool = await supa
    .from('deleted_tools')
    .select('slug')
    .eq('reason', 'non_ai_audit')
  const allDeletedCompare = await supa
    .from('deleted_tools')
    .select('slug')
    .eq('reason', 'non_ai_audit_compare')
  if (allDeletedTool.error) throw allDeletedTool.error
  if (allDeletedCompare.error) throw allDeletedCompare.error

  const toolSlugs = (allDeletedTool.data ?? []).map((r) => r.slug).sort()
  const cmpSlugs = (allDeletedCompare.data ?? [])
    .map((r) => r.slug.replace(/^compare\//, ''))
    .sort()

  writeFileSync(
    STATIC_OUT,
    `/**
 * Phase 9 Day-4 — Hard-deleted tool slugs.
 *
 * Loaded by \`proxy.ts\` to return HTTP 410 Gone for dead URLs (both
 * \`/tools/<slug>\` and any \`/compare/<slug>\` that referenced the tool).
 *
 * Source of truth: \`deleted_tools\` table in Supabase. Regenerated by
 * \`scripts/execute-non-ai-delete.ts\` on every delete batch.
 *
 * DO NOT hand-edit. Run the delete script and let it rewrite this file.
 */

export const DELETED_TOOL_SLUGS = new Set<string>(${JSON.stringify(toolSlugs, null, 2)})

export const DELETED_COMPARE_SLUGS = new Set<string>(${JSON.stringify(cmpSlugs, null, 2)})

export const DELETED_LAST_GENERATED_AT = '${now}'
`,
  )
  console.log(`[execute] wrote ${STATIC_OUT} (${toolSlugs.length} tools, ${cmpSlugs.length} compares)`)

  // 5. IndexNow ping (Bing/Yandex deindexation accelerator)
  if (!skipIndexNow) {
    const urls = [
      ...fetched.map((r) => `/tools/${r.slug}`),
      ...compareHits.map((c) => `/compare/${c.slug}`),
    ]
    console.log(`[execute] pinging IndexNow with ${urls.length} URLs…`)
    await submitToIndexNow(urls)
    console.log('[execute] IndexNow ping sent')
  } else {
    console.log('[execute] --skip-indexnow set, not pinging')
  }

  console.log('\n[execute] DONE.')
  console.log(`  - tools deleted: ${ids.length}`)
  console.log(`  - compares deleted: ${compareHits.length}`)
  console.log(`  - 410 set size: tools=${toolSlugs.length}, compares=${cmpSlugs.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
