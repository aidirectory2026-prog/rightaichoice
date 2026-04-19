import { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils/slugify'
import type { EnrichedToolData } from './enrich'

export interface CurateContext {
  /** Slugs already present in `tools` (any publication state) */
  existingSlugs: Set<string>
  /** Minimum viability proxy (plan: viability > 30) */
  minViabilityProxy: number
}

export interface CurateInput {
  name: string
  websiteUrl: string
  enriched: EnrichedToolData
}

export interface CurateDecision {
  pass: boolean
  reasons: string[]
  viabilityProxy: number
  slug: string
}

export async function loadCurateContext(supabase: SupabaseClient): Promise<CurateContext> {
  const { data } = await supabase.from('tools').select('slug')
  const existingSlugs = new Set<string>()
  for (const row of (data ?? []) as { slug: string }[]) {
    if (row.slug) existingSlugs.add(row.slug)
  }
  return { existingSlugs, minViabilityProxy: 30 }
}

export function curateCandidate(input: CurateInput, ctx: CurateContext): CurateDecision {
  const reasons: string[] = []
  const slug = slugify(input.name)

  if (!input.name?.trim()) reasons.push('missing-name')
  if (!input.websiteUrl?.trim() || !/^https?:\/\//i.test(input.websiteUrl)) reasons.push('bad-url')
  if (!input.enriched.tagline?.trim()) reasons.push('missing-tagline')
  if (!input.enriched.description?.trim() || input.enriched.description.length < 80) reasons.push('thin-description')
  if (ctx.existingSlugs.has(slug)) reasons.push('slug-collision')

  const viabilityProxy = estimateViabilityProxy(input.enriched)
  if (viabilityProxy < ctx.minViabilityProxy) reasons.push(`low-viability:${viabilityProxy}`)

  return { pass: reasons.length === 0, reasons, viabilityProxy, slug }
}

function estimateViabilityProxy(e: EnrichedToolData): number {
  let score = 60
  if (e.pricing_type === 'paid' || e.pricing_type === 'freemium') score += 15
  else if (e.pricing_type === 'free') score -= 10
  if (e.has_api) score += 10
  if ((e.features ?? []).length >= 3) score += 5
  if ((e.features ?? []).length === 0) score -= 20
  if (!e.tagline?.trim()) score -= 30
  if ((e.editorial_verdict ?? '').length >= 80) score += 5
  return Math.max(0, Math.min(100, score))
}
