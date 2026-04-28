import { createClient } from '@/lib/supabase/server'
import { fetchAllPages } from '@/lib/data/_pagination'
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

  // Fetch submitter profile separately — submitted_by FK targets auth.users,
  // not profiles, so PostgREST cannot resolve a direct join.
  let submitter = null
  if (data.submitted_by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .eq('id', data.submitted_by)
      .single()
    submitter = profile
  }

  return { ...data, submitter }
}

export async function getFeaturedTools(limit = 6) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('tools')
    .select('id, name, slug, tagline, logo_url, website_url, pricing_type, avg_rating, review_count, is_sponsored')
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
    .select('id, name, slug, tagline, logo_url, website_url, pricing_type, avg_rating, review_count, is_sponsored')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getAllToolSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  const supabase = await createClient()
  return fetchAllPages<{ slug: string; updated_at: string }>((from, to) =>
    supabase
      .from('tools')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })
      .range(from, to)
  )
}

// Step 40 Slice 5 — for a list of free-text integration names, return a
// map of lowercased name → slug for tools that exist in our catalog.
// Lets the tool page render integration chips as internal links where
// possible (and plain text where not), boosting crawlable internal links
// without breaking for integrations we don't yet have pages for.
export async function getIntegrationLinks(names: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const trimmed = names.map((n) => n.trim()).filter(Boolean)
  if (trimmed.length === 0) return out
  const supabase = await createClient()
  const { data } = await supabase
    .from('tools')
    .select('name, slug')
    .eq('is_published', true)
    .in('name', trimmed)
  for (const row of (data ?? []) as { name: string; slug: string }[]) {
    out.set(row.name.toLowerCase(), row.slug)
  }
  return out
}

export async function searchTools(query: string) {
  const supabase = await createClient()
  const term = query.trim()
  if (!term) return { tools: [], categories: [], tags: [] }

  // Search tools, categories, and tags in parallel
  const [toolsRes, catsRes, tagsRes] = await Promise.all([
    supabase
      .from('tools')
      .select('id, name, slug, tagline, logo_url, website_url, pricing_type')
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

/**
 * Phase 7 Step 50 (BUG-015): rank "Alternatives" by *identity* similarity, not
 * raw popularity-within-category. Iteration 2 — earlier scoring let Mintlify
 * (documentation platform) and INK Editor (SEO writer) surface as alternatives
 * to Claude because they share generic capability tags like `writing-assistant`
 * and `code-generation`. Identity tags (`chatbot`, `text-generation`, etc.) are
 * what actually defines a tool's product type, so they dominate the score.
 *
 * Scoring per candidate (when the source has at least one identity tag):
 *   - +10 per shared IDENTITY tag (chatbot, llm, image-generation, …)
 *   - +3  per shared NON-identity tag (writing-assistant, research, …)
 *   - +1  per non-stop-word tagline word ≥4 chars also in source tagline
 *   - +log10(view_count)*0.5 tiebreaker
 *   - HARD GATE: must share at least one identity tag — otherwise filtered.
 * When source has no identity tag (niche/specialty tool), fall back to: tag
 * overlap (any tag) + word overlap, score ≥ 5.
 */

const IDENTITY_TAGS = new Set([
  // Image
  'image-generation',
  'image-editing',
  'image-editor',
  // Video
  'video-generation',
  'video-editing',
  'video-editor',
  // Audio / voice
  'voice-cloning',
  'voice-generation',
  'tts',
  'transcription',
  'music-generation',
  'audio-generation',
  // Search / research engines
  'ai-search',
  'search-engine',
  // Code IDEs (the product, not "writes code as a side effect")
  'ai-ide',
  'code-completion',
  // Avatars / agents
  'ai-avatar',
  'autonomous-agent',
])

/**
 * Tag slug that marks a tool as a general-purpose LLM (Claude, ChatGPT,
 * Gemini, …). Used as a hard filter in the Alternatives ranker — when the
 * source tool carries this tag, only other tools carrying the same tag
 * surface as alternatives. Specialized tools (Sourcegraph Cody, INK Editor)
 * that happen to share `chatbot` or `text-generation` get filtered out.
 *
 * `chatbot` and `text-generation` are deliberately NOT in IDENTITY_TAGS
 * because the catalog applies them too liberally. This tag is the targeted
 * fix for the LLM-alternatives case. Migration 056 seeds the tag and links
 * the canonical LLMs.
 */
const GENERAL_LLM_TAG = 'general-purpose-llm'

const TAGLINE_STOP_WORDS = new Set([
  // generic AI/SaaS marketing terms
  'powered',
  'platform',
  'tool',
  'tools',
  'software',
  'solution',
  'solutions',
  'service',
  'services',
  'product',
  'application',
  'system',
  // pronouns / fillers
  'with',
  'your',
  'this',
  'that',
  'from',
  'into',
  'over',
  'using',
  'helps',
  'help',
  'make',
  'makes',
  'create',
  'creates',
  'build',
  'builds',
  'manage',
  // generic descriptors
  'assistant',
  'helper',
  'driven',
  'enhanced',
  'enabled',
  'integrated',
  'advanced',
  'simple',
  'easy',
  'fast',
  'powerful',
  'better',
  'modern',
  'professional',
  'comprehensive',
  // "real-time" / "next-gen" survives the alpha-only filter as "realtime"
  'realtime',
  'real',
  'time',
])

export async function getAlternativeTools(
  toolId: string,
  categoryIds: string[],
  limit = 4,
  opts?: {
    sourceSlug?: string
    sourceTagSlugs?: string[]
    sourceTagline?: string
    sourceName?: string
  }
) {
  const supabase = await createClient()

  if (categoryIds.length === 0) return []

  const { data: relatedIds } = await supabase
    .from('tool_categories')
    .select('tool_id')
    .in('category_id', categoryIds)
    .neq('tool_id', toolId)

  if (!relatedIds || relatedIds.length === 0) return []

  const uniqueIds = [...new Set(relatedIds.map((r) => r.tool_id))]

  const { data } = await supabase
    .from('tools')
    .select(
      `id, name, slug, tagline, logo_url, website_url, pricing_type, avg_rating, review_count, view_count, tool_tags(tags(slug))`
    )
    .eq('is_published', true)
    .in('id', uniqueIds)
    .limit(80)

  if (!data || data.length === 0) return []

  const sourceTagSet = new Set(opts?.sourceTagSlugs ?? [])
  const sourceIdentityTags = new Set(
    [...sourceTagSet].filter((slug) => IDENTITY_TAGS.has(slug))
  )
  const sourceWordSet = new Set(
    (opts?.sourceTagline ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !TAGLINE_STOP_WORDS.has(w))
  )
  const sourceNameLower = (opts?.sourceName ?? '').trim().toLowerCase()

  type Row = {
    id: string
    name: string
    slug: string
    tagline: string | null
    logo_url: string | null
    website_url: string | null
    pricing_type: string
    avg_rating: number | null
    review_count: number | null
    view_count: number | null
    tool_tags: Array<{ tags: { slug: string } | { slug: string }[] | null }> | null
  }

  const useIdentityGate = sourceIdentityTags.size > 0
  const sourceIsGeneralLLM = sourceTagSet.has(GENERAL_LLM_TAG)

  const scored = (data as unknown as Row[])
    .map((row) => {
      const candTagSlugs = (row.tool_tags ?? []).flatMap((t) => {
        if (!t.tags) return []
        return Array.isArray(t.tags) ? t.tags.map((x) => x.slug) : [t.tags.slug]
      })
      const candTagSet = new Set(candTagSlugs)
      const sharedIdentity = [...sourceIdentityTags].filter((s) => candTagSet.has(s))
      const sharedAnyTag = [...sourceTagSet].filter((s) => candTagSet.has(s))
      const sharedNonIdentity = sharedAnyTag.filter((s) => !IDENTITY_TAGS.has(s))

      let score = 0
      score += sharedIdentity.length * 10
      score += sharedNonIdentity.length * 3

      const candTagline = (row.tagline ?? '').toLowerCase()
      let wordOverlap = 0
      for (const w of sourceWordSet) {
        if (candTagline.includes(w)) wordOverlap += 1
      }
      score += wordOverlap

      // Small popularity tiebreaker — never enough to overpower a real signal,
      // but breaks ties between equally-related candidates.
      score += Math.log10((row.view_count ?? 0) + 1) * 0.5

      return { row, score, sharedIdentity, sharedAnyTag, candTagSet }
    })
    .filter((x) => {
      // LLM whitelist gate (highest precedence). When source is a general-
      // purpose LLM (Claude, ChatGPT, Gemini, …), alternatives MUST also
      // carry the general-purpose-llm tag. This is the only reliable way
      // to keep specialized tools (Sourcegraph Cody, INK Editor) out of
      // "Alternatives to Claude" given that the catalog applies `chatbot`
      // and `text-generation` tags too liberally.
      if (sourceIsGeneralLLM) {
        return x.candTagSet.has(GENERAL_LLM_TAG)
      }
      if (useIdentityGate) {
        // Source has identity tag(s) → alternative must share ≥1.
        // Filters Mintlify-style cross-domain matches.
        return x.sharedIdentity.length >= 1
      }
      // Source has no identity tag (niche specialty). Fall back to "any signal":
      // ≥1 shared tag OR ≥3 shared non-stop tagline words.
      if (sourceTagSet.size === 0 && sourceWordSet.size === 0) {
        // No source signal supplied — caller is on the legacy code path.
        return true
      }
      return x.sharedAnyTag.length >= 1 || x.score >= 5
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => {
      const candNameLower = x.row.name.trim().toLowerCase()
      if (sourceNameLower && candNameLower === sourceNameLower) return null
      return {
        id: x.row.id,
        name: x.row.name,
        slug: x.row.slug,
        tagline: x.row.tagline ?? '',
        logo_url: x.row.logo_url,
        website_url: x.row.website_url,
        pricing_type: x.row.pricing_type,
        avg_rating: x.row.avg_rating ?? 0,
        review_count: x.row.review_count ?? 0,
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  return scored
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
