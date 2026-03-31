import { createClient } from '@/lib/supabase/server'

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

  // Preserve input order
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
 * Get a saved comparison by slug.
 */
export async function getComparisonBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tool_comparisons')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null

  // Atomic view count increment (fire-and-forget)
  supabase.rpc('adjust_counter', {
    target_table: 'tool_comparisons',
    target_id: data.id,
    counter_field: 'view_count',
    delta: 1,
  }).then(() => {})

  return data
}
