import { createClient } from '@/lib/supabase/server'

export type AISearchParams = {
  query: string
  pricing_type?: string
  skill_level?: string
  platform?: string
  has_api?: boolean
  category?: string
  /** When true, skip the internal top-rated fallback if keyword search returns 0 hits. */
  disableFallback?: boolean
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
  integrations: string[]
  best_for: string[]
}

/** Escape characters that have special meaning in Supabase ilike patterns */
function sanitizeLike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // backslash first
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/[(),"'`;]/g, '') // strip chars that could break .or() filter syntax
    .slice(0, 200) // cap length to prevent oversized queries
}

// Words that match almost every tool in the catalog ("ai" hits ~95% of taglines,
// "tool"/"app" hit most marketing copy, etc.) and therefore destroy ranking
// signal when OR-matched. Dropped before search; if a query is *only* stop
// words, we restore them as a last resort so we still return something.
const STOP_WORDS = new Set([
  'ai', 'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'to', 'in',
  'on', 'at', 'by', 'tool', 'tools', 'app', 'apps', 'software', 'platform',
  'platforms', 'best', 'top', 'free', 'paid', 'use', 'using', 'how',
])

/**
 * Light stemming so noun-form keywords ("writer", "editor", "designer") match
 * verb-form taglines ("writing", "edit", "design"). Without this, market-leader
 * tools like ChatGPT (tagline: "...writing, analysis...") don't match Sonnet's
 * "blog writer" searchQuery. We add the stem alongside the original keyword
 * (not in place of) so exact matches still rank highest.
 */
function stemKeyword(kw: string): string | null {
  const k = kw.toLowerCase()
  if (k.length < 5) return null
  if (k.endsWith('ing') && k.length >= 6) return k.slice(0, -3)        // writing -> writ
  if (k.endsWith('ers') && k.length >= 6) return k.slice(0, -3)        // writers -> writ
  if (k.endsWith('ors') && k.length >= 6) return k.slice(0, -3)        // editors -> edit
  if (k.endsWith('er') && k.length >= 5) return k.slice(0, -2)         // writer  -> writ
  if (k.endsWith('or') && k.length >= 5) return k.slice(0, -2)         // editor  -> edit
  if (k.endsWith('ed') && k.length >= 5) return k.slice(0, -2)         // edited  -> edit
  if (k.endsWith('ation') && k.length >= 7) return k.slice(0, -5)       // generation -> gener
  if (k.endsWith('s') && k.length >= 5 && !k.endsWith('ss')) return k.slice(0, -1) // logos -> logo
  return null
}

/**
 * Score a candidate tool by where each keyword hits. Heavily favors name matches.
 * If a keyword doesn't match exactly, falls back to its stem (writer→writ) at
 * a discount — this is how we bridge "blog writer" (Sonnet) → "AI assistant
 * for writing..." (ChatGPT tagline).
 */
function relevanceScore(
  tool: { name?: string; tagline?: string; description?: string; best_for?: string[]; integrations?: string[] },
  keywords: string[]
): number {
  if (keywords.length === 0) return 0
  const name = (tool.name ?? '').toLowerCase()
  const tagline = (tool.tagline ?? '').toLowerCase()
  const description = (tool.description ?? '').toLowerCase()
  const bestFor = (tool.best_for ?? []).join(' ').toLowerCase()
  const integrations = (tool.integrations ?? []).join(' ').toLowerCase()

  let score = 0
  let nameHits = 0
  let anyFieldHits = 0
  for (const kw of keywords) {
    let hit = false
    let nameHit = false
    if (name.includes(kw)) { score += 10; nameHit = true; hit = true }
    if (tagline.includes(kw)) { score += 5; hit = true }
    if (bestFor.includes(kw)) { score += 4; hit = true }
    if (integrations.includes(kw)) { score += 2; hit = true }
    if (description.includes(kw)) { score += 1; hit = true }

    if (!hit) {
      // Fall back to stem match at a discount.
      const stem = stemKeyword(kw)
      if (stem && stem.length >= 4) {
        if (name.includes(stem)) { score += 6; nameHit = true; hit = true }
        if (tagline.includes(stem)) { score += 3; hit = true }
        if (bestFor.includes(stem)) { score += 2; hit = true }
        if (description.includes(stem)) { score += 1; hit = true }
      }
    }

    if (nameHit) nameHits += 1
    if (hit) anyFieldHits += 1
  }
  // Big bonus for matching every keyword somewhere — distinguishes a tool that
  // matches "video editor" fully from one that matches only "video".
  if (anyFieldHits === keywords.length && keywords.length > 1) score += 25
  // Smaller bonus if the name matches more than one keyword (e.g. "AI Video Editor").
  if (nameHits >= 2) score += 15
  return score
}

export async function searchToolsForAI(params: AISearchParams): Promise<AIToolResult[]> {
  const supabase = await createClient()
  const term = sanitizeLike(params.query.trim())

  // If category filter, get matching tool IDs first
  // If category doesn't match any tools, skip it and rely on keyword search instead
  let categoryToolIds: string[] | null = null
  if (params.category) {
    const { data: catData } = await supabase
      .from('tool_categories')
      .select('tool_id, categories!inner(slug)')
      .eq('categories.slug', params.category)
    categoryToolIds = catData?.map((row) => row.tool_id) ?? []
    if (categoryToolIds.length === 0) {
      categoryToolIds = null // Don't filter by category — fall through to keyword search
    }
  }

  let query = supabase
    .from('tools')
    .select(`
      id, name, slug, tagline, description, pricing_type, skill_level,
      has_api, platforms, avg_rating, review_count, website_url,
      integrations, best_for,
      tool_categories(categories(name)),
      tool_tags(tags(name))
    `)
    .eq('is_published', true)

  // Build keyword list, dropping stop-words that destroy ranking signal.
  let keywords: string[] = []
  if (term) {
    const raw = term
      .split(/\s+/)
      .map(sanitizeLike)
      .filter((w) => w.length >= 2)
      .slice(0, 6)
    const filtered = raw.filter((w) => !STOP_WORDS.has(w.toLowerCase()))
    keywords = filtered.length > 0 ? filtered : raw // last-resort: keep stop-words if that's all we have
  }

  // Expand keywords with stems so noun-form queries match verb-form taglines.
  // The stems are also passed to the scorer so it can reward stem matches at
  // a discount (full match = +10 name, stem match = +6 name).
  const searchPatterns: string[] = []
  for (const kw of keywords) {
    searchPatterns.push(kw)
    const stem = stemKeyword(kw)
    if (stem && stem.length >= 4 && !STOP_WORDS.has(stem)) searchPatterns.push(stem)
  }
  const uniquePatterns = [...new Set(searchPatterns)]

  if (uniquePatterns.length > 0) {
    // OR across name/tagline/description for recall. best_for[] is an array
    // column — we re-rank against it in JS after fetch rather than predicating
    // on it here (Postgres array ilike across .or() is awkward).
    const conditions = uniquePatterns.flatMap((kw) => [
      `name.ilike.%${kw}%`,
      `tagline.ilike.%${kw}%`,
      `description.ilike.%${kw}%`,
    ])
    query = query.or(conditions.join(','))
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

  // Pull a wider candidate pool so JS-side relevance ranking can pick the best
  // out of many. Avg_rating is the seed-order field, but until reviews land
  // (currently 0 across the whole catalog) it carries no signal — relevance
  // ranking has to do the real work below.
  query = query.order('avg_rating', { ascending: false }).limit(40)

  const { data, error } = await query
  if (error) return []

  // Fallback: if keyword search returned nothing, try broader category-only search
  if ((!data || data.length === 0) && !categoryToolIds && !params.disableFallback) {
    const fallbackQuery = supabase
      .from('tools')
      .select(`
        id, name, slug, tagline, description, pricing_type, skill_level,
        has_api, platforms, avg_rating, review_count, website_url,
        integrations, best_for,
        tool_categories(categories(name)),
        tool_tags(tags(name))
      `)
      .eq('is_published', true)
      .order('avg_rating', { ascending: false })
      .order('review_count', { ascending: false })
      .limit(6)

    const { data: fallbackData } = await fallbackQuery
    if (fallbackData && fallbackData.length > 0) {
      return fallbackData.map(mapTool)
    }
    return []
  }

  if (!data) return []

  // Re-rank by relevance score, with review_count + avg_rating as tie-breakers.
  // Stable for ties via final name comparison so output is deterministic.
  const lcKeywords = keywords.map((k) => k.toLowerCase())
  const ranked = data
    .map((tool) => ({
      tool,
      score: relevanceScore(tool, lcKeywords),
    }))
    // Drop zero-score rows when we *did* have meaningful keywords — they
    // sneaked in via stop-word OR matches and are not relevant. If we have
    // no keywords (browse mode), keep everything.
    .filter((row) => lcKeywords.length === 0 || row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if ((b.tool.review_count ?? 0) !== (a.tool.review_count ?? 0)) {
        return (b.tool.review_count ?? 0) - (a.tool.review_count ?? 0)
      }
      if ((b.tool.avg_rating ?? 0) !== (a.tool.avg_rating ?? 0)) {
        return (b.tool.avg_rating ?? 0) - (a.tool.avg_rating ?? 0)
      }
      return (a.tool.name ?? '').localeCompare(b.tool.name ?? '')
    })

  // Dedupe by case-insensitive name. The catalog has ~38 name collisions
  // across distinct slugs (e.g. "fusionads.ai" exists as slugs fusionos-ai
  // AND fusionads-ai). Showing the same name twice in one stage looks broken
  // even when the rows are technically distinct.
  const seen = new Set<string>()
  const deduped: typeof ranked = []
  for (const row of ranked) {
    const key = (row.tool.name ?? '').trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(row)
    if (deduped.length >= 10) break
  }

  return deduped.map((r) => mapTool(r.tool))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTool(tool: any): AIToolResult {
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
    integrations: tool.integrations ?? [],
    best_for: tool.best_for ?? [],
  }
}
