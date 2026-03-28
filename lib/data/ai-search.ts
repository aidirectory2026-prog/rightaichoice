import { createClient } from '@/lib/supabase/server'

export type AISearchParams = {
  query: string
  pricing_type?: string
  skill_level?: string
  platform?: string
  has_api?: boolean
  category?: string
}

export type AIToolResult = {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  pricing_type: string
  skill_level: string
  has_api: boolean
  platforms: string[]
  avg_rating: number
  review_count: number
  website_url: string
  categories: string[]
  tags: string[]
}

export async function searchToolsForAI(params: AISearchParams): Promise<AIToolResult[]> {
  const supabase = await createClient()
  const term = params.query.trim()

  // If category filter, get matching tool IDs first
  let categoryToolIds: string[] | null = null
  if (params.category) {
    const { data: catData } = await supabase
      .from('tool_categories')
      .select('tool_id, categories!inner(slug)')
      .eq('categories.slug', params.category)
    categoryToolIds = catData?.map((row) => row.tool_id) ?? []
    if (categoryToolIds.length === 0) return []
  }

  let query = supabase
    .from('tools')
    .select(`
      id, name, slug, tagline, description, pricing_type, skill_level,
      has_api, platforms, avg_rating, review_count, website_url,
      tool_categories(categories(name)),
      tool_tags(tags(name))
    `)
    .eq('is_published', true)

  // Text search across name, tagline, description
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,tagline.ilike.%${term}%,description.ilike.%${term}%`
    )
  }

  if (categoryToolIds) {
    query = query.in('id', categoryToolIds)
  }
  if (params.pricing_type) {
    query = query.eq('pricing_type', params.pricing_type)
  }
  if (params.skill_level) {
    query = query.eq('skill_level', params.skill_level)
  }
  if (params.has_api) {
    query = query.eq('has_api', true)
  }
  if (params.platform) {
    query = query.contains('platforms', [params.platform])
  }

  query = query.order('avg_rating', { ascending: false }).limit(10)

  const { data, error } = await query
  if (error || !data) return []

  return data.map((tool) => {
    const cats = (tool.tool_categories as unknown as { categories: { name: string } }[])
      ?.map((tc) => tc.categories?.name)
      .filter(Boolean) ?? []
    const tags = (tool.tool_tags as unknown as { tags: { name: string } }[])
      ?.map((tt) => tt.tags?.name)
      .filter(Boolean) ?? []

    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      tagline: tool.tagline,
      description: tool.description,
      pricing_type: tool.pricing_type,
      skill_level: tool.skill_level,
      has_api: tool.has_api,
      platforms: tool.platforms,
      avg_rating: tool.avg_rating,
      review_count: tool.review_count,
      website_url: tool.website_url,
      categories: cats,
      tags,
    }
  })
}
