/**
 * Phase 7H — Internal-linking helpers (Phase 7B.seo follow-on for indexing).
 *
 * Returns prioritized lists of related editorial comparisons + related
 * tools for cross-linking sections on /compare/[slug], /categories/[slug],
 * and /tools/[slug]. Single source of truth so visual presentation can
 * vary per page but the link selection logic stays consistent.
 *
 * All queries are read-only and run in the browser-server-render path
 * via the cookie-aware createClient (NOT the admin client) — RLS
 * filters apply but tool_comparisons.is_editorial=true rows have a
 * "public read" RLS policy so anonymous renders work fine.
 */
import { createClient } from '@/lib/supabase/server'

export type RelatedCompare = {
  slug: string
  toolNames: string[]
  verdict: string
}

/**
 * Editorial compares featuring tool A OR tool B, excluding the current
 * pair (so /compare/cursor-vs-windsurf doesn't link back to itself).
 * Used at the bottom of /compare/[slug] to surface 4-6 sibling pages.
 */
export async function getRelatedComparesForPair(
  toolAId: string,
  toolBId: string,
  currentSlug: string,
  limit = 6
): Promise<RelatedCompare[]> {
  const supabase = await createClient()

  // .or() with .contains() can't combine cleanly via the postgrest
  // builder, so we run two queries + merge. Both are bounded so this
  // is fast.
  const [a, b] = await Promise.all([
    supabase
      .from('tool_comparisons')
      .select('slug, tool_ids, verdict, view_count')
      .eq('is_editorial', true)
      .contains('tool_ids', [toolAId])
      .neq('slug', currentSlug)
      .order('view_count', { ascending: false })
      .limit(limit * 2),
    supabase
      .from('tool_comparisons')
      .select('slug, tool_ids, verdict, view_count')
      .eq('is_editorial', true)
      .contains('tool_ids', [toolBId])
      .neq('slug', currentSlug)
      .order('view_count', { ascending: false })
      .limit(limit * 2),
  ])

  type Row = { slug: string; tool_ids: string[]; verdict: string | null; view_count: number }
  const all = [...((a.data ?? []) as Row[]), ...((b.data ?? []) as Row[])]
  const seen = new Set<string>()
  const dedup = all.filter((r) => {
    if (seen.has(r.slug)) return false
    seen.add(r.slug)
    return true
  })
  // Sort by view_count desc and take top N
  dedup.sort((x, y) => (y.view_count ?? 0) - (x.view_count ?? 0))
  const top = dedup.slice(0, limit)
  if (top.length === 0) return []

  const allToolIds = Array.from(new Set(top.flatMap((r) => r.tool_ids)))
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name')
    .in('id', allToolIds)
  const nameById = new Map((tools ?? []).map((t: any) => [t.id as string, t.name as string]))

  return top.map((r) => ({
    slug: r.slug,
    toolNames: r.tool_ids
      .map((id) => nameById.get(id))
      .filter(Boolean) as string[],
    verdict: (r.verdict ?? '').slice(0, 200),
  }))
}

/**
 * Editorial compares featuring AT LEAST ONE tool in the given category.
 * Used on /categories/[slug] to surface "Featured comparisons in this
 * category" — turns a thin listing page into a hub with 6+ outbound
 * editorial links.
 *
 * Two-step query: (1) get tool IDs in the category, (2) get compares
 * containing any of those IDs. Postgrest doesn't support array-overlap
 * filters in a clean single call.
 */
export async function getRelatedComparesForCategory(
  categoryId: string,
  limit = 6
): Promise<RelatedCompare[]> {
  const supabase = await createClient()

  const { data: catTools } = await supabase
    .from('tool_categories')
    .select('tool_id')
    .eq('category_id', categoryId)
    .limit(500)
  const toolIds = ((catTools ?? []) as Array<{ tool_id: string }>).map((r) => r.tool_id)
  if (toolIds.length === 0) return []

  // Postgrest doesn't have a clean "array overlaps any of these" filter
  // for a JSONB array column, so we issue parallel .contains() queries
  // (one per tool, capped) and merge. For most categories this is 30-80
  // tools — bounded, fast.
  const sample = toolIds.slice(0, 80)
  const results = await Promise.all(
    sample.map((id) =>
      supabase
        .from('tool_comparisons')
        .select('slug, tool_ids, verdict, view_count')
        .eq('is_editorial', true)
        .contains('tool_ids', [id])
        .order('view_count', { ascending: false })
        .limit(limit)
    )
  )

  type Row = { slug: string; tool_ids: string[]; verdict: string | null; view_count: number }
  const all: Row[] = results.flatMap((r) => (r.data ?? []) as Row[])
  const seen = new Set<string>()
  const dedup = all.filter((r) => {
    if (seen.has(r.slug)) return false
    seen.add(r.slug)
    return true
  })
  dedup.sort((x, y) => (y.view_count ?? 0) - (x.view_count ?? 0))
  const top = dedup.slice(0, limit)
  if (top.length === 0) return []

  const allToolIds = Array.from(new Set(top.flatMap((r) => r.tool_ids)))
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name')
    .in('id', allToolIds)
  const nameById = new Map((tools ?? []).map((t: any) => [t.id as string, t.name as string]))

  return top.map((r) => ({
    slug: r.slug,
    toolNames: r.tool_ids
      .map((id) => nameById.get(id))
      .filter(Boolean) as string[],
    verdict: (r.verdict ?? '').slice(0, 200),
  }))
}
