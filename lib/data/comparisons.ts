import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { fetchAllPages } from '@/lib/data/_pagination'

/**
 * Fetch multiple tools by their slugs with full details for comparison.
 * Returns tools in the same order as the input slugs.
 */
export async function getToolsForComparison(slugs: string[]) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tools')
    .select(`
      *,
      tool_categories(categories(*)),
      tool_tags(tags(*))
    `)
    .in('slug', slugs)
    .eq('is_published', true)

  if (error || !data) return []

  const bySlug = new Map(data.map((t) => [t.slug, t]))
  return slugs.map((s) => bySlug.get(s)).filter(Boolean)
}

/**
 * Save a comparison to the DB with a shareable slug.
 * Slug format: "tool1-vs-tool2-vs-tool3"
 */
export async function saveComparison(
  toolIds: string[],
  comparisonSlug: string,
  userId?: string
) {
  const supabase = await createClient()

  // Check if this exact comparison already exists
  const { data: existing } = await supabase
    .from('tool_comparisons')
    .select('id, slug')
    .eq('slug', comparisonSlug)
    .maybeSingle()

  if (existing) {
    // Atomic view count increment
    await supabase.rpc('adjust_counter', {
      target_table: 'tool_comparisons',
      target_id: existing.id,
      counter_field: 'view_count',
      delta: 1,
    })
    return existing.slug
  }

  const { data, error } = await supabase
    .from('tool_comparisons')
    .insert({
      tool_ids: toolIds,
      slug: comparisonSlug,
      user_id: userId ?? null,
    })
    .select('slug')
    .single()

  if (error) throw error
  return data.slug
}

/**
 * Fetch multiple tools by their UUIDs for a saved comparison.
 * Uses admin client (no cookies) so the SSG /compare/[slug] route
 * can pre-render at build time without hitting DYNAMIC_SERVER_USAGE.
 */
export async function getToolsForComparisonByIds(ids: string[]): Promise<Record<string, unknown>[]> {
  const db = getAdminClient()

  const { data, error } = await db
    .from('tools')
    .select(`
      *,
      tool_categories(categories(*)),
      tool_tags(tags(*))
    `)
    .in('id', ids)
    .eq('is_published', true)

  if (error || !data) return []

  // Preserve input order
  const rows = data as Record<string, unknown>[]
  const byId = new Map(rows.map((t) => [t.id as string, t]))
  return ids.map((id) => byId.get(id)).filter(Boolean) as Record<string, unknown>[]
}

/**
 * Get all saved comparison slugs for sitemap generation.
 */
export async function getAllComparisonSlugs() {
  // Use admin client (no cookies) — called from generateStaticParams and sitemap at build time
  const db = getAdminClient()

  return fetchAllPages<{ slug: string; updated_at: string }>((from, to) =>
    db
      .from('tool_comparisons')
      .select('slug, updated_at')
      .order('view_count', { ascending: false })
      .range(from, to)
  )
}

/**
 * Fetch editorial comparisons that feature a given tool (by id).
 * Used on /tools/[slug] pages to surface head-to-head editorial content.
 */
export async function getEditorialComparisonsForTool(toolId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tool_comparisons')
    .select('slug, tool_ids, verdict, view_count')
    .eq('is_editorial', true)
    .contains('tool_ids', [toolId])
    .order('published_at', { ascending: false })

  if (error || !data) return []
  return data as { slug: string; tool_ids: string[]; verdict: string | null; view_count: number }[]
}

/**
 * Fetch top editorial comparisons for the homepage hero rail.
 */
export async function getFeaturedEditorialComparisons(limit = 6) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tool_comparisons')
    .select('slug, tool_ids, verdict, view_count, published_at')
    .eq('is_editorial', true)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  const allIds = Array.from(new Set(data.flatMap((c) => c.tool_ids as string[])))
  if (allIds.length === 0) return []

  const { data: tools } = await supabase
    .from('tools')
    .select('id, slug, name')
    .in('id', allIds)

  const nameById = new Map((tools ?? []).map((t) => [t.id, t.name as string]))

  return data.map((c) => ({
    slug: c.slug as string,
    verdict: (c.verdict as string | null) ?? '',
    toolNames: (c.tool_ids as string[]).map((id) => nameById.get(id)).filter(Boolean) as string[],
  }))
}

/**
 * Get a saved comparison by slug.
 * Uses admin client (no cookies) so the SSG /compare/[slug] route
 * can pre-render at build time without hitting DYNAMIC_SERVER_USAGE.
 */
export async function getComparisonBySlug(
  slug: string,
): Promise<Record<string, unknown> | null> {
  const db = getAdminClient()

  const { data, error } = await db
    .from('tool_comparisons')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !data) return null

  const row = data as Record<string, unknown>

  // Atomic view count increment (fire-and-forget, swallow all errors).
  // Runs in the background after the response is returned; awaiting would
  // block render, and the admin-client rpc builder can throw synchronously
  // if chained incorrectly, so wrap in try/catch + PromiseLike-safe await.
  ;(async () => {
    try {
      await (db as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown>
      }).rpc('adjust_counter', {
        target_table: 'tool_comparisons',
        target_id: row.id as string,
        counter_field: 'view_count',
        delta: 1,
      })
    } catch {
      // swallow — view-count bumps are best-effort
    }
  })()

  return row
}
