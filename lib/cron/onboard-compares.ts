/**
 * Alternatives resolution + editorial-compare creation for the onboard SOP
 * (Phase 9 D2).
 *
 * ALTERNATIVES ARE COMPUTED LIVE. There is no `tool_alternatives` edge table —
 * lib/data/tools.ts getAlternativeTools() ranks category siblings on the fly at
 * render time. That function uses the request-scoped (cookie-auth) Supabase
 * client and product-page-specific opts, so it isn't directly callable from a
 * cron/admin context. This module reproduces the SAME underlying signal it
 * relies on (published siblings sharing a category, ranked by view_count) using
 * the admin client, so:
 *   - the ">=3 alternatives resolvable" gate is honest, and
 *   - we have concrete top-alternative tools to build editorial compares vs.
 *
 * EDITORIAL COMPARES: for the top N alternatives we create tool_comparisons
 * rows with is_editorial=true and tool_ids=[newTool, alt], then invoke the
 * single-compare editorial generator (generateCompareEditorial from
 * cascade-editorials.ts) to fill the prose inline. The weekly cascade cron will
 * keep them fresh thereafter via v_stale_comparisons.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateCompareEditorial } from './cascade-editorials'

export type AltTool = {
  id: string
  slug: string
  name: string
  view_count: number | null
}

/**
 * Resolve up to `limit` alternative tools for a tool, live from category
 * siblings (the same data getAlternativeTools ranks). Published only, excludes
 * the source tool, ranked by view_count desc. Returns [] if the tool has no
 * categories or no siblings.
 */
export async function resolveAlternatives(
  supabase: SupabaseClient,
  toolId: string,
  limit = 6,
): Promise<AltTool[]> {
  // Phase 9 D2 fix — resolve DB-side via onboard_alternatives() RPC (migration
  // 135). The previous approach fetched all sibling tool_ids then did
  // `.in('id', [hundreds])`, which built an over-long PostgREST URL that failed
  // silently → 0 alternatives even for tools with 800+ siblings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('onboard_alternatives', {
    p_tool_id: toolId,
    p_limit: limit,
  })
  if (error) throw new Error(`onboard_alternatives: ${error.message}`)
  return ((data ?? []) as AltTool[]).slice(0, limit)
}

/** Slugify two tool slugs into a stable, unique compare slug `a-vs-b`. */
function compareSlug(aSlug: string, bSlug: string): string {
  return `${aSlug}-vs-${bSlug}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

export type CompareCreationResult = {
  created: number
  generated: number
  existing: number
  slugs: string[]
  errors: string[]
}

/**
 * Create up to `targetCount` editorial compares (newTool vs top alternatives)
 * and generate their prose inline. Idempotent: skips compares whose slug or
 * tool-pair already exists. Returns counts + the compare slugs touched.
 */
export async function createEditorialCompares(
  supabase: SupabaseClient,
  tool: { id: string; slug: string },
  alternatives: AltTool[],
  targetCount = 3,
): Promise<CompareCreationResult> {
  const result: CompareCreationResult = { created: 0, generated: 0, existing: 0, slugs: [], errors: [] }
  const targets = alternatives.slice(0, Math.max(targetCount, 2))

  for (const alt of targets) {
    const slug = compareSlug(tool.slug, alt.slug)
    result.slugs.push(slug)

    // Idempotent: a row may already exist by slug (either direction) or by the
    // tool_ids pair from a prior run.
    const { data: existingBySlug } = await supabase
      .from('tool_comparisons')
      .select('id, tool_ids, verdict')
      .or(`slug.eq.${slug},slug.eq.${compareSlug(alt.slug, tool.slug)}`)
      .limit(1)
    const existing = (existingBySlug ?? [])[0] as
      | { id: string; tool_ids: string[]; verdict: string | null }
      | undefined

    let comparisonId: string
    let needsProse: boolean
    if (existing) {
      result.existing++
      comparisonId = existing.id
      needsProse = !existing.verdict
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('tool_comparisons')
        .insert(
          {
            tool_ids: [tool.id, alt.id],
            slug,
            is_editorial: true,
            published_at: new Date().toISOString(),
          } as never,
        )
        .select('id')
        .single()
      if (insErr || !inserted) {
        result.errors.push(`insert ${slug}: ${insErr?.message ?? 'no row'}`)
        continue
      }
      result.created++
      comparisonId = (inserted as { id: string }).id
      needsProse = true
    }

    if (needsProse) {
      const gen = await generateCompareEditorial(comparisonId, [tool.id, alt.id], supabase)
      if (gen.ok) result.generated++
      else result.errors.push(`gen ${slug}: ${gen.error ?? '?'}`)
    }
  }

  return result
}

/** Count existing editorial compares that reference this tool. */
export async function countEditorialCompares(
  supabase: SupabaseClient,
  toolId: string,
): Promise<number> {
  const { data } = await supabase
    .from('tool_comparisons')
    .select('id')
    .eq('is_editorial', true)
    .contains('tool_ids', [toolId])
  return (data ?? []).length
}
