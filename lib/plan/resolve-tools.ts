import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIToolResult } from '@/lib/data/ai-search'

/**
 * Phase 7 Step 50 — Resolve LLM-emitted tool names to catalog records.
 *
 * The /api/plan route asks Sonnet to emit a `recommendedTools` array per stage
 * (e.g. ["ChatGPT", "Beehiiv"]). This module turns those names into actual
 * catalog tool records so the rendered cards match what the model said in prose.
 *
 * Match cascade per name:
 *   1. exact_slug   — slug = normalized(name) (lowercased, spaces→hyphens)
 *   2. exact_name   — case-insensitive name match (suffixes "Plus/Pro/AI" stripped)
 *   3. fuzzy        — substring match between requested coreName and candidate coreName
 *   4. none         — caller renders a "[Tool] — not in catalog yet" placeholder
 *
 * Never returns an unrelated popular tool. The silent popularity fallback in
 * stage-search.ts tier 4 was the BUG-005 root cause this module exists to prevent.
 */

export type ResolutionStatus = 'exact_slug' | 'exact_name' | 'fuzzy' | 'none'

export type ResolvedToolEntry = {
  requestedName: string
  resolved: AIToolResult | null
  matchKind: ResolutionStatus
}

const SUFFIX_NOISE = [
  ' plus',
  ' pro',
  ' ai',
  ' app',
  '.ai',
  '.io',
  '.com',
  '.app',
  '.xyz',
  '.co',
]

function normalize(name: string): {
  lowered: string
  coreName: string
  slugForm: string
  flatForm: string
} {
  const lowered = name.trim().toLowerCase()
  let coreName = lowered
  for (const suffix of SUFFIX_NOISE) {
    if (coreName.endsWith(suffix)) {
      coreName = coreName.slice(0, -suffix.length).trim()
    }
  }
  const slugForm = lowered.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  // flatForm strips all non-alphanumerics so "eleven labs", "elevenlabs",
  // "Eleven-Labs", and "ElevenLabs" all collapse to "elevenlabs". Used as
  // the last-resort key before declaring a name unmatchable.
  const flatForm = lowered.replace(/[^a-z0-9]/g, '')
  return { lowered, coreName, slugForm, flatForm }
}

function escapeFilterValue(s: string): string {
  return s.replace(/[(),"'`;]/g, '').slice(0, 60)
}

/**
 * Pick the best catalog match for a single LLM-named tool. Exported for
 * deterministic testing — see scripts/verify-plan-matcher.ts.
 */
export function pickBestMatch(name: string, candidates: AIToolResult[]): ResolvedToolEntry {
  const { lowered, coreName, slugForm, flatForm } = normalize(name)

  const exactSlug = candidates.find((c) => c.slug === slugForm)
  if (exactSlug) {
    return { requestedName: name, resolved: exactSlug, matchKind: 'exact_slug' }
  }

  const exactName = candidates
    .filter((c) => {
      const cl = c.name.trim().toLowerCase()
      return cl === lowered || cl === coreName
    })
    .sort((a, b) => a.name.length - b.name.length)[0]
  if (exactName) {
    return { requestedName: name, resolved: exactName, matchKind: 'exact_name' }
  }

  // Flat-form match: strips spaces/hyphens so "eleven labs" matches "ElevenLabs",
  // "github copilot" matches "github-copilot", etc. Ranks above looser fuzzy
  // matching but below true exact matches.
  if (flatForm.length >= 4) {
    const flatMatches = candidates
      .filter((c) => {
        const candFlat = normalize(c.name).flatForm
        return candFlat === flatForm
      })
      .sort((a, b) => a.name.length - b.name.length)
    if (flatMatches.length > 0) {
      return { requestedName: name, resolved: flatMatches[0], matchKind: 'fuzzy' }
    }
  }

  if (coreName.length >= 3) {
    const ranked = candidates
      .map((c) => {
        const candCore = normalize(c.name).coreName
        let score = 0
        if (candCore === coreName) {
          score = 10
        } else if (candCore.startsWith(coreName) || coreName.startsWith(candCore)) {
          if (Math.min(candCore.length, coreName.length) >= 3) score = 7
        } else if (candCore.includes(coreName) && coreName.length >= 4) {
          score = 5
        } else if (coreName.includes(candCore) && candCore.length >= 4) {
          score = 4
        }
        return { tool: c, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.tool.name.length - b.tool.name.length)
    if (ranked.length > 0) {
      return { requestedName: name, resolved: ranked[0].tool, matchKind: 'fuzzy' }
    }
  }

  return { requestedName: name, resolved: null, matchKind: 'none' }
}

/**
 * Resolve a list of LLM-emitted tool names against the catalog in a single
 * batched query. Returns one entry per input name, in input order.
 */
export async function resolveToolsByName(
  names: string[],
  supabase: SupabaseClient
): Promise<ResolvedToolEntry[]> {
  const cleaned = names.map((n) => n.trim()).filter((n) => n.length >= 2 && n.length < 80)
  if (cleaned.length === 0) return []

  const norms = cleaned.map((n) => ({ raw: n, ...normalize(n) }))
  const conditions: string[] = []
  for (const n of norms) {
    const safeSlug = escapeFilterValue(n.slugForm)
    const safeCore = escapeFilterValue(n.coreName)
    if (safeSlug.length >= 2) conditions.push(`slug.eq.${safeSlug}`)
    if (safeCore.length >= 2) conditions.push(`name.ilike.${safeCore}%`)
    if (safeCore.length >= 3) conditions.push(`name.ilike.%${safeCore}%`)
  }

  if (conditions.length === 0) {
    return cleaned.map((name) => ({
      requestedName: name,
      resolved: null,
      matchKind: 'none' as const,
    }))
  }

  const { data, error } = await supabase
    .from('tools')
    .select(
      `id, name, slug, tagline, description, pricing_type, skill_level, has_api, platforms, avg_rating, review_count, website_url, integrations, best_for`
    )
    .eq('is_published', true)
    .or(conditions.join(','))
    .limit(80)

  if (error || !data) {
    return cleaned.map((name) => ({
      requestedName: name,
      resolved: null,
      matchKind: 'none' as const,
    }))
  }

  type Row = {
    id: string
    name: string
    slug: string
    tagline: string | null
    description: string | null
    pricing_type: string
    skill_level: string | null
    has_api: boolean | null
    platforms: string[] | null
    avg_rating: number | null
    review_count: number | null
    website_url: string | null
    integrations: string[] | null
    best_for: string[] | null
  }

  const candidates: AIToolResult[] = (data as Row[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline ?? '',
    description: row.description ?? '',
    pricing_type: row.pricing_type,
    skill_level: row.skill_level ?? '',
    has_api: row.has_api ?? false,
    platforms: row.platforms ?? [],
    avg_rating: row.avg_rating ?? 0,
    review_count: row.review_count ?? 0,
    website_url: row.website_url ?? '',
    categories: [],
    tags: [],
    integrations: row.integrations ?? [],
    best_for: row.best_for ?? [],
  }))

  return cleaned.map((name) => pickBestMatch(name, candidates))
}
