import { createClient } from '@/lib/supabase/server'
import { getAdminClient } from '@/lib/cron/supabase-admin'
import { fetchAllPages } from '@/lib/data/_pagination'
import { sanitizeLike } from '@/lib/data/_sanitize'
import type { ToolFilters } from '@/types'

const TOOLS_PER_PAGE = 24

export async function getTools(filters: ToolFilters = {}) {
  const supabase = await createClient()
  // Phase 10 #18 — clamp the page to a sane integer. A NaN/negative/garbage page
  // (e.g. ?page=abc or ?page=-5) previously produced a negative/NaN .range() that
  // PostgREST rejected → a thrown error / blank page that crawlers could trigger.
  const rawPage = Number(filters.page)
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
  const from = (page - 1) * TOOLS_PER_PAGE
  const to = from + TOOLS_PER_PAGE - 1

  // Category filter is applied via an inner-join embed on the junction table
  // (`cat_filter`) instead of fetching every matching tool_id and feeding them
  // back as `.in('id', [hundreds])`. For large categories (e.g. data-analytics
  // has ~480 published tools) the ID-array approach built a >16KB PostgREST URL
  // that overflowed undici's header limit (HeadersOverflowError) and crashed the
  // listing. The separate aliased `!inner` embed constrains the parent rows
  // while the unaliased `tool_categories` embed still returns every category per
  // tool for display consumers (e.g. /best/[slug]).
  const selectCols = filters.category
    ? '*, tool_categories(category_id, categories(*)), cat_filter:tool_categories!inner(categories!inner(slug))'
    : '*, tool_categories(category_id, categories(*))'

  // Relevance-ranked niche path (doc 22): resolve the niche term to a list of
  // tool ids pre-ordered by ts_rank_cd (via the niche_tool_ids RPC), then
  // constrain + reorder the main query by that id list. This keeps the full
  // row shape / category embed / other filters intact while replacing the
  // popularity ordering with relevance — so "best AI tools for [niche]" leads
  // with niche-relevant tools, not broadly-popular loose matches.
  const term = filters.search?.trim() ?? ''
  let rankedIds: string[] | null = null
  if (filters.rankByRelevance && term.length > 2) {
    const { data: idRows, error: rankErr } = await supabase.rpc('niche_tool_ids', {
      p_niche: term,
      p_limit: TOOLS_PER_PAGE * 2,
    })
    if (rankErr) throw rankErr
    rankedIds = ((idRows as { id: string }[] | null) ?? []).map((r) => r.id)
  }

  // Cast the (runtime-valid) select to the base literal: supabase-js parses the
  // select string at the type level and rejects the nested `categories!inner`
  // embed, but the cat_filter embed is stripped from the result below, so the
  // base literal accurately describes the returned shape consumers depend on.
  let query = supabase
    .from('tools')
    .select(selectCols as '*, tool_categories(category_id, categories(*))', { count: 'exact' })
    .eq('is_published', true)

  if (filters.category) {
    query = query.eq('cat_filter.categories.slug', filters.category)
  }

  // Text search: ilike for short queries (≤2 chars where tsvector lexemes
  // would be empty), websearch_to_tsquery via the search_vector GIN index
  // (Phase 5.4 migration 079) for everything else. websearch_to_tsquery
  // accepts natural input ("video editor without watermark") without
  // requiring users to learn tsquery syntax.
  if (rankedIds) {
    // No matches → return empty (avoid an unconstrained `.in('id', [])`).
    if (rankedIds.length === 0) {
      return { tools: [], total: 0, page, totalPages: 0 }
    }
    query = query.in('id', rankedIds)
  } else if (filters.search) {
    if (term.length <= 2) {
      const safe = sanitizeLike(term)
      query = query.ilike('name', `%${safe}%`)
    } else {
      query = query.textSearch('search_vector', term, {
        type: 'websearch',
        config: 'english',
      })
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

  // Ranked path: fetch the whole ranked set (DB order is overridden by the JS
  // reorder below) so the relevance order isn't truncated by pagination.
  query = rankedIds ? query.range(0, rankedIds.length - 1) : query.range(from, to)

  const { data, count, error } = await query
  if (error) throw error

  // Drop the filter-only `cat_filter` embed so the returned shape matches the
  // unfiltered query exactly (consumers only read `tool_categories`).
  let tools = (data ?? []).map((row) => {
    if (row && typeof row === 'object' && 'cat_filter' in row) {
      const clone = { ...(row as Record<string, unknown>) }
      delete clone.cat_filter
      return clone
    }
    return row
  })

  // Ranked path: PostgREST `.in('id', …)` ignores list order, so re-sort the
  // returned rows to match the relevance order from niche_tool_ids.
  if (rankedIds) {
    const pos = new Map(rankedIds.map((id, i) => [id, i]))
    tools = tools.sort((a, b) => {
      const ai = pos.get((a as { id: string }).id) ?? Number.MAX_SAFE_INTEGER
      const bi = pos.get((b as { id: string }).id) ?? Number.MAX_SAFE_INTEGER
      return ai - bi
    })
  }

  return {
    tools,
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
  // Cowork QA: public data — cookie-free admin client so the homepage can be
  // statically cached (createClient() reads cookies → forces dynamic render).
  const supabase = getAdminClient() as Awaited<ReturnType<typeof createClient>>

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
  const safe = sanitizeLike(term) // Phase 9.0.4 — prevent .or() filter injection
  if (!safe) return { tools: [], categories: [], tags: [] }

  // Search tools, categories, and tags in parallel
  const [toolsRes, catsRes, tagsRes] = await Promise.all([
    supabase
      .from('tools')
      .select('id, name, slug, tagline, logo_url, website_url, pricing_type')
      .eq('is_published', true)
      .or(`name.ilike.%${safe}%,tagline.ilike.%${safe}%`)
      .order('view_count', { ascending: false })
      .limit(6),
    supabase
      .from('categories')
      .select('id, name, slug, icon')
      .ilike('name', `%${safe}%`)
      .limit(3),
    supabase
      .from('tags')
      .select('id, name, slug')
      .ilike('name', `%${safe}%`)
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

/**
 * Tags that are applied so liberally across the catalog that they carry no
 * "this is the same product type" signal. Stripped from BOTH source and
 * candidate before scoring/gating so a Supabase/Hugging-Face overlap on
 * `open-source` + `api-tool` + `rag` doesn't surface Hugging Face as a
 * Supabase alternative. (~100-150 tools each in seed data.)
 *
 * IDENTITY_TAGS, GENERAL_LLM_TAG, and product-type tags (image-generation,
 * voice-cloning, etc.) are deliberately NOT here — they're the discriminating
 * signal we want to preserve.
 */
const TAG_STOP_WORDS = new Set([
  'open-source',
  'api-tool',
  'rag',
  'agent',
  'workflow',
  'fine-tuning',
  'automation',
  // Skill-level / pricing markers that occasionally appear as content tags
  'beginner',
  'intermediate',
  'advanced',
  'expert',
])

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

/**
 * Phase 9 B4 (2026-05-28): cached read of un-indexed tool slugs from
 * gsc_url_inspections. Used to bias the sibling-rail toward tool pages
 * Google has crawled but not indexed (or hasn't discovered yet), so
 * crawl-priority authority flows from the popular hubs into the long
 * tail.
 *
 * Buckets we treat as "needs help":
 *   - Discovered - currently not indexed   (crawl budget)
 *   - Crawled - currently not indexed      (quality)
 *   - URL is unknown to Google             (never discovered)
 *   - Duplicate without user-selected canonical
 *
 * Refreshed in-memory with a 5-minute TTL — the underlying audit only
 * runs weekly so a soft cache is plenty.
 */
const UNINDEXED_STATES = new Set([
  'Discovered - currently not indexed',
  'Crawled - currently not indexed',
  'URL is unknown to Google',
  'Duplicate without user-selected canonical',
])

const UNINDEXED_CACHE_TTL_MS = 5 * 60 * 1000
let unindexedToolSlugsCache: { slugs: Set<string>; loadedAt: number } | null = null

async function getUnindexedToolSlugs(): Promise<Set<string>> {
  const now = Date.now()
  if (
    unindexedToolSlugsCache &&
    now - unindexedToolSlugsCache.loadedAt < UNINDEXED_CACHE_TTL_MS
  ) {
    return unindexedToolSlugsCache.slugs
  }
  const supabase = await createClient()
  const { data } = await supabase
    .from('gsc_url_inspections')
    .select('url')
    .eq('page_type', 'tool')
    .in('coverage_state', Array.from(UNINDEXED_STATES))
  const slugs = new Set<string>()
  for (const row of (data ?? []) as Array<{ url: string }>) {
    // url shape: https://rightaichoice.com/tools/<slug>
    const match = row.url.match(/\/tools\/([^/?#]+)/)
    if (match) slugs.add(match[1])
  }
  unindexedToolSlugsCache = { slugs, loadedAt: now }
  return slugs
}

/**
 * Phase 9 Smart SEO (2026-05-29): cached read of BURIED-but-indexed tool
 * slugs (weighted GSC position ~20-50) from gsc_tool_positions. These pages
 * ARE indexed but rank on page 3-5; the legitimate lever to lift them is
 * internal links, so we fold them into the same sibling-rail "needs help"
 * bias as un-indexed pages. 5-min TTL (table refreshes weekly off the GSC
 * snapshot).
 */
const BURIED_POS_MIN = 20
const BURIED_POS_MAX = 50
let buriedToolSlugsCache: { slugs: Set<string>; loadedAt: number } | null = null

async function getBuriedToolSlugs(): Promise<Set<string>> {
  const now = Date.now()
  if (
    buriedToolSlugsCache &&
    now - buriedToolSlugsCache.loadedAt < UNINDEXED_CACHE_TTL_MS
  ) {
    return buriedToolSlugsCache.slugs
  }
  const supabase = await createClient()
  const { data } = await supabase
    .from('gsc_tool_positions')
    .select('slug')
    .gte('weighted_position', BURIED_POS_MIN)
    .lte('weighted_position', BURIED_POS_MAX)
  const slugs = new Set<string>()
  for (const row of (data ?? []) as Array<{ slug: string }>) {
    if (row.slug) slugs.add(row.slug)
  }
  buriedToolSlugsCache = { slugs, loadedAt: now }
  return slugs
}

/**
 * Union of un-indexed + buried-but-indexed tool slugs — every tool page that
 * benefits from more internal-link equity. One call, both signals cached.
 */
async function getLinkBoostToolSlugs(): Promise<Set<string>> {
  const [unindexed, buried] = await Promise.all([
    getUnindexedToolSlugs(),
    getBuriedToolSlugs(),
  ])
  if (buried.size === 0) return unindexed
  const union = new Set(unindexed)
  for (const s of buried) union.add(s)
  return union
}

/**
 * Phase 4.5 audit fix (2026-05-09): Loose category-based "tools you might
 * also like" fallback used by the page handler when getAlternativeTools'
 * strict identity-tag ranker returns nothing. This is intentionally
 * permissive — the section header switches to "Top tools in <Category>"
 * so we're honest about it being a category roll-up, not a curated
 * alternatives list. 934 of 1,178 production pages were rendering NO
 * alternatives section because the strict ranker filtered everything out.
 */
export async function getTopInCategory(
  categoryIds: string[],
  excludeToolId: string,
  limit = 4
) {
  const supabase = await createClient()

  // Path 1: tool has categories — fetch popular siblings.
  if (categoryIds.length > 0) {
    {
      // Phase 9 B4 (2026-05-28): fetch a wider pool (up to 60) so we can
      // re-rank by indexation state before slicing to `limit`. Otherwise
      // top-by-view_count always wins and un-indexed siblings never get
      // surfaced for crawl-priority transfer.
      //
      // Filtering is done via an inner-join embed on the junction table
      // (`cat_filter`) keyed on the source tool's own category_ids — NOT by
      // fetching every sibling tool_id and feeding them back as
      // `.in('id', [hundreds])`, which for large categories (data-analytics
      // ~480 tools) built a >16KB PostgREST URL that overflowed undici's header
      // limit → caught upstream → this fallback also silently returned nothing.
      const { data: rawPool } = await supabase
        .from('tools')
        .select(
          `id, name, slug, tagline, logo_url, website_url, pricing_type, avg_rating, review_count, view_count, cat_filter:tool_categories!inner(category_id)`
        )
        .eq('is_published', true)
        .neq('id', excludeToolId)
        .in('cat_filter.category_id', categoryIds)
        .order('view_count', { ascending: false })
        .limit(Math.max(limit * 5, 40))
      // Drop the filter-only embed so returned rows match the prior shape.
      const data = (rawPool ?? []).map((row) => {
        const clone = { ...(row as Record<string, unknown>) }
        delete clone.cat_filter
        return clone
      }) as NonNullable<typeof rawPool>
      if (data && data.length > 0) {
        const unindexed = await getLinkBoostToolSlugs()
        // Promote un-indexed siblings into the first slots while keeping
        // the relative view_count order within each tier. Result: ~half
        // of the `limit` slots tend to be un-indexed when there are
        // enough candidates, while a popular cluster never returns 0
        // recognizable picks.
        const needHelp = data.filter((t) => unindexed.has(t.slug))
        const alreadyIndexed = data.filter((t) => !unindexed.has(t.slug))
        const interleaved: typeof data = []
        let i = 0
        let j = 0
        // Lead with 2 un-indexed picks (if available), then alternate.
        while (interleaved.length < limit && (i < needHelp.length || j < alreadyIndexed.length)) {
          const wantUnindexed = interleaved.length < 2 || interleaved.length % 2 === 0
          if (wantUnindexed && i < needHelp.length) interleaved.push(needHelp[i++])
          else if (j < alreadyIndexed.length) interleaved.push(alreadyIndexed[j++])
          else if (i < needHelp.length) interleaved.push(needHelp[i++])
        }
        return interleaved.slice(0, limit)
      }
    }
  }

  // Path 2 (Phase 4.5 last-resort, 2026-05-09): tool has no categories at
  // all (167 of 1,178 published rows). Return the most-viewed published
  // tools globally so the alternatives section never disappears. Honest
  // "Top tools" framing in the page render makes this clear.
  const { data } = await supabase
    .from('tools')
    .select(
      `id, name, slug, tagline, logo_url, website_url, pricing_type, avg_rating, review_count, view_count`
    )
    .eq('is_published', true)
    .neq('id', excludeToolId)
    .order('view_count', { ascending: false })
    .limit(limit)
  return data ?? []
}

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

  // Resolve candidate siblings via an inner-join embed on the junction table
  // (filtering by the source tool's own category_ids) instead of fetching every
  // sibling tool_id and feeding them back as `.in('id', [hundreds])`. For a tool
  // in a large category (e.g. data-analytics, ~480 published tools) the ID-array
  // approach built a >16KB PostgREST URL that overflowed undici's header limit
  // (HeadersOverflowError) → caught upstream → zero alternatives. `categoryIds`
  // is small (the source tool's own categories), so this URL stays tiny. The
  // inner-join returns each candidate once; ordering by view_count makes the
  // 80-candidate cap deterministic (top siblings) rather than arbitrary.
  const { data } = await supabase
    .from('tools')
    .select(
      `id, name, slug, tagline, logo_url, website_url, pricing_type, avg_rating, review_count, view_count, tool_tags(tags(slug)), cat_filter:tool_categories!inner(category_id)`
    )
    .eq('is_published', true)
    .neq('id', toolId)
    .in('cat_filter.category_id', categoryIds)
    .order('view_count', { ascending: false })
    .limit(80)

  if (!data || data.length === 0) return []

  // Strip generic high-frequency tags from the source signal so a Supabase
  // page doesn't try to match candidates on `open-source` alone. The full
  // unfiltered set is still used for the LLM-tag check below (since
  // GENERAL_LLM_TAG is not a stop word).
  const sourceTagsRaw = new Set(opts?.sourceTagSlugs ?? [])
  const sourceTagSet = new Set(
    [...sourceTagsRaw].filter((slug) => !TAG_STOP_WORDS.has(slug))
  )
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
  // LLM-tag check uses the unfiltered source set since GENERAL_LLM_TAG is not
  // a stop word — both Supabase-class and Claude-class sources route correctly.
  const sourceIsGeneralLLM = sourceTagsRaw.has(GENERAL_LLM_TAG)
  // Phase 9 B4 (2026-05-28): authoritative un-indexed signal from
  // gsc_url_inspections (replaces the view_count=0 proxy below).
  const unindexedSlugs = await getLinkBoostToolSlugs()

  const scored = (data as unknown as Row[])
    .map((row) => {
      const candTagSlugs = (row.tool_tags ?? []).flatMap((t) => {
        if (!t.tags) return []
        return Array.isArray(t.tags) ? t.tags.map((x) => x.slug) : [t.tags.slug]
      })
      // Full set (used for the LLM-tag check) and stop-word-filtered set
      // (used for similarity scoring/gating).
      const candTagSetRaw = new Set(candTagSlugs)
      const candTagSet = new Set(candTagSlugs.filter((s) => !TAG_STOP_WORDS.has(s)))
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

      // Phase 9 B4 (2026-05-28): un-indexed tiebreaker, now driven by
      // the real GSC URL Inspection signal (gsc_url_inspections) instead
      // of a view_count=0 proxy.
      //
      // Un-indexed (any of: discovered-not-indexed, crawled-not-indexed,
      // unknown-to-Google, dup-without-canonical) gets +1. Already-
      // indexed tools get a small penalty scaled by view_count, capped
      // at -1. Tools not yet inspected fall back to the view_count
      // proxy. Cap at ±1 keeps this strictly a tiebreaker — a single
      // shared identity tag is worth 10pts.
      const viewCount = row.view_count ?? 0
      if (unindexedSlugs.has(row.slug)) {
        score += 1
      } else if (unindexedSlugs.size > 0) {
        // The cache is loaded (we have data) and this slug isn't in
        // the un-indexed set → treat as indexed.
        score += Math.max(-1, 1 - Math.log10(viewCount + 1) * 0.5)
      } else {
        // Cache miss / empty (e.g. table not yet populated). Fall back
        // to the view_count proxy so the function still works.
        score += viewCount === 0 ? 1 : Math.max(-1, 1 - Math.log10(viewCount + 1) * 0.5)
      }

      return { row, score, sharedIdentity, sharedAnyTag, candTagSetRaw }
    })
    .filter((x) => {
      // LLM whitelist gate (highest precedence). When source is a general-
      // purpose LLM (Claude, ChatGPT, Gemini, …), alternatives MUST also
      // carry the general-purpose-llm tag. This is the only reliable way
      // to keep specialized tools (Sourcegraph Cody, INK Editor) out of
      // "Alternatives to Claude" given that the catalog applies `chatbot`
      // and `text-generation` tags too liberally.
      if (sourceIsGeneralLLM) {
        return x.candTagSetRaw.has(GENERAL_LLM_TAG)
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

/**
 * Phase 6.4 (2026-05-11): fetch tools matching the slugs in the
 * 'rac_recent' cookie, in the order the slugs were given. Used by the
 * homepage + /tools index "Recently viewed" rail. Caller is responsible
 * for parsing the cookie (lives in next/headers, not lib).
 */
export async function getToolsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('tools')
    .select(
      `id, name, slug, tagline, logo_url, website_url, pricing_type, avg_rating, review_count, view_count, viability_score`
    )
    .in('slug', slugs)
    .eq('is_published', true)
  if (!data) return []
  // Preserve the input order (cookie is most-recent-first); Supabase
  // .in() returns rows in DB order so we re-sort here.
  const bySlug = new Map(data.map((t) => [t.slug, t]))
  return slugs.map((s) => bySlug.get(s)).filter(Boolean) as typeof data
}

/**
 * Phase 6.2 (2026-05-11): list every saved tool for a user, newest-first.
 * Used by /saved page. Joins user_saved_tools → tools so we get the same
 * shape ToolCard expects. Falls back to empty array on any error.
 */
export async function getSavedTools(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_saved_tools')
    .select(
      `created_at, tools(id, name, slug, tagline, logo_url, website_url, pricing_type, avg_rating, review_count, view_count, viability_score)`
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  // Supabase types this as `tools: T | T[]` depending on FK resolution; in
  // practice tool_id → tools is a single row, but we defensively unwrap.
  return (data ?? [])
    .map((row: { tools: unknown }) => (Array.isArray(row.tools) ? row.tools[0] : row.tools))
    .filter(Boolean) as Array<{
      id: string
      name: string
      slug: string
      tagline: string
      logo_url: string | null
      website_url: string
      pricing_type: string
      avg_rating: number
      review_count: number
      view_count: number
      viability_score: number | null
    }>
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

export async function logPageView(path: string, toolId?: string, userId?: string, referrer?: string | null) {
  const supabase = await createClient()
  await supabase.from('page_views').insert({
    path,
    tool_id: toolId ?? null,
    user_id: userId ?? null,
    // Attribution-fix (2026-06-10) — column existed since 001 but every row
    // was null because no caller ever passed it.
    referrer: referrer ? referrer.slice(0, 400) : null,
  } as never)
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
