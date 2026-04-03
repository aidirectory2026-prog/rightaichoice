import { createClient } from '@/lib/supabase/server'
import type { ToolFilters } from '@/types'

const TOOLS_PER_PAGE = 24

/** Escape characters that have special meaning in Supabase ilike patterns */
function sanitizeLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/[(),"'`;]/g, '')
    .slice(0, 200)
}

export async function getTools(filters: ToolFilters = {}) {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const from = (page - 1) * TOOLS_PER_PAGE
  const to = from + TOOLS_PER_PAGE - 1

  // If category filter is set, first get matching tool IDs via junction table
  let categoryToolIds: string[] | null = null
  if (filters.category) {
    const { data: catData } = await supabase
      .from('tool_categories')
      .select('tool_id, categories!inner(slug)')
      .eq('categories.slug', filters.category)
    categoryToolIds = catData?.map((row) => row.tool_id) ?? []
  }

  let query = supabase
    .from('tools')
    .select('*, tool_categories(category_id, categories(*))', { count: 'exact' })
    .eq('is_published', true)

  // Category filter: restrict to matching tool IDs
  if (categoryToolIds !== null) {
    if (categoryToolIds.length === 0) {
      return { tools: [], total: 0, page, totalPages: 0 }
    }
    query = query.in('id', categoryToolIds)
  }

  // Text search: ilike for short queries, FTS for longer ones
  if (filters.search) {
    const term = sanitizeLike(filters.search.trim())
    if (term.length <= 2) {
      query = query.ilike('name', `%${term}%`)
    } else {
      query = query.or(
        `name.ilike.%${term}%,tagline.ilike.%${term}%,description.ilike.%${term}%`
      )
    }
  }

  if (filters.pricing) query = query.eq('pricing_type', filters.pricing)
  if (filters.skill_level) query = query.eq('skill_level', filters.skill_level)
  if (filters.has_api) query = query.eq('has_api', true)
  if (filters.platform) query = query.contains('platforms', [filters.platform])

  switch (filters.sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'most_reviewed':
      query = query.order('review_count', { ascending: false })
      break
    case 'alphabetical':
      query = query.order('name', { ascending: true })
      break
    default:
      query = query.order('view_count', { ascending: false })
  }

  query = query.range(from, to)

  const { data, count, error } = await query
  if (error) throw error

  return {
    tools: data ?? [],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / TOOLS_PER_PAGE),
  }
}

export async function getToolBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tools')
    .select(`
      *,
      tool_categories(categories(*)),
      tool_tags(tags(*))
    `)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (error) return null
  return data
}

export async function getFeaturedTools(limit = 6) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tools')
    .select('id, name, slug, tagline, logo_url, pricing_type, avg_rating, review_count, is_sponsored')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('view_count', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getTrendingTools(limit = 8) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tools')
    .select('id, name, slug, tagline, logo_url, pricing_type, avg_rating, review_count, is_sponsored')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getAllToolSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tools')
    .select('slug, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
  return data ?? []
}

export async function searchTools(query: string) {
  const supabase = await createClient()
  const term = query.trim()
  if (!term) return { tools: [], categories: [], tags: [] }

  // Search tools, categories, and tags in parallel
  const [toolsRes, catsRes, tagsRes] = await Promise.all([
    supabase
      .from('tools')
      .select('id, name, slug, tagline, logo_url, pricing_type')
      .eq('is_published', true)
      .or(`name.ilike.%${term}%,tagline.ilike.%${term}%`)
      .order('view_count', { ascending: false })
      .limit(6),
    supabase
      .from('categories')
      .select('id, name, slug, icon')
      .ilike('name', `%${term}%`)
      .limit(3),
    supabase
      .from('tags')
      .select('id, name, slug')
      .ilike('name', `%${term}%`)
      .limit(4),
  ])

  return {
    tools: toolsRes.data ?? [],
    categories: catsRes.data ?? [],
    tags: tagsRes.data ?? [],
  }
}

export async function logSearch(query: string, resultCount: number, userId?: string) {
  const supabase = await createClient()
  await supabase.from('search_logs').insert({
    query: query.trim().toLowerCase(),
    result_count: resultCount,
    user_id: userId ?? null,
  })
}

export async function getAlternativeTools(toolId: string, categoryIds: string[], limit = 4) {
  const supabase = await createClient()

  if (categoryIds.length === 0) return []

  // Get tool IDs in the same categories
  const { data: relatedIds } = await supabase
    .from('tool_categories')
    .select('tool_id')
    .in('category_id', categoryIds)
    .neq('tool_id', toolId)

  if (!relatedIds || relatedIds.length === 0) return []

  const uniqueIds = [...new Set(relatedIds.map((r) => r.tool_id))]

  const { data } = await supabase
    .from('tools')
    .select('id, name, slug, tagline, logo_url, pricing_type, avg_rating, review_count')
    .eq('is_published', true)
    .in('id', uniqueIds)
    .order('view_count', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function isToolSaved(toolId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_saved_tools')
    .select('tool_id')
    .eq('tool_id', toolId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function toggleSaveTool(toolId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const saved = await isToolSaved(toolId, userId)

  if (saved) {
    await supabase
      .from('user_saved_tools')
      .delete()
      .eq('tool_id', toolId)
      .eq('user_id', userId)
    return false
  } else {
    await supabase
      .from('user_saved_tools')
      .insert({ tool_id: toolId, user_id: userId })
    return true
  }
}

export async function logPageView(path: string, toolId?: string, userId?: string) {
  const supabase = await createClient()
  await supabase.from('page_views').insert({
    path,
    tool_id: toolId ?? null,
    user_id: userId ?? null,
  })
}

export async function logClick(toolId: string, source: string, userId?: string) {
  const supabase = await createClient()
  await supabase.from('click_logs').insert({
    tool_id: toolId,
    source,
    user_id: userId ?? null,
  })
}

/** Get tools not verified in the last N days (for admin staleness dashboard) */
export async function getStaleTools(days = 90) {
  const supabase = await createClient()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('tools')
    .select('id, name, slug, pricing_type, is_published, last_verified_at, website_url')
    .eq('is_published', true)
    .or(`last_verified_at.is.null,last_verified_at.lt.${cutoff}`)
    .order('last_verified_at', { ascending: true, nullsFirst: true })

  return data ?? []
}

/** Get freshness stats for admin dashboard */
export async function getFreshnessStats() {
  const supabase = await createClient()
  const now = Date.now()
  const days30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const days90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: allTools } = await supabase
    .from('tools')
    .select('id, last_verified_at')
    .eq('is_published', true)

  if (!allTools) return { total: 0, fresh: 0, aging: 0, stale: 0, neverVerified: 0 }

  let fresh = 0, aging = 0, stale = 0, neverVerified = 0
  for (const t of allTools) {
    if (!t.last_verified_at) { neverVerified++; continue }
    if (t.last_verified_at >= days30) fresh++
    else if (t.last_verified_at >= days90) aging++
    else stale++
  }

  return { total: allTools.length, fresh, aging, stale, neverVerified }
}

export async function getPopularSearches(limit = 8) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('search_logs')
    .select('query')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!data || data.length === 0) return []

  // Count frequency and return top queries
  const counts = new Map<string, number>()
  for (const row of data) {
    const q = row.query.toLowerCase()
    counts.set(q, (counts.get(q) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([query]) => query)
}
