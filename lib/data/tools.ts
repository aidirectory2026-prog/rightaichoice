import { createClient } from '@/lib/supabase/server'
import type { ToolFilters } from '@/types'

const TOOLS_PER_PAGE = 24

export async function getTools(filters: ToolFilters = {}) {
  const supabase = await createClient()
  const page = filters.page ?? 1
  const from = (page - 1) * TOOLS_PER_PAGE
  const to = from + TOOLS_PER_PAGE - 1

  let query = supabase
    .from('tools')
    .select('*, tool_categories(category_id, categories(*))', { count: 'exact' })
    .eq('is_published', true)

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
    .select('id, name, slug, tagline, logo_url, pricing_type, avg_rating, review_count')
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
    .select('id, name, slug, tagline, logo_url, pricing_type, avg_rating, review_count')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function searchTools(query: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tools')
    .select('id, name, slug, tagline, logo_url, pricing_type')
    .eq('is_published', true)
    .textSearch('name', query, { type: 'websearch' })
    .limit(10)

  return data ?? []
}
