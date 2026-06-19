import { createClient } from '@/lib/supabase/server'

// Phase 11 B3 (2026-06-18) — live inline fact for blog MDX.
//
// Blog posts are static MDX, so a hardcoded fact like "Claude (100k context)" or
// "$20/mo" goes stale the moment the tool changes — the freshness cascade already
// revalidates a tool's mapped blog pages (page_tool_mentions → pages_freshness →
// cascade-hubs), but revalidating static prose changes nothing. This component
// reads the CURRENT value from the DB at render time, so on the next revalidation
// the fact updates itself. Authors swap a volatile literal for:
//
//   <ToolFact slug="chatgpt" field="starting_price" fallback="$20/mo" />
//
// `fallback` renders if the tool/field is missing, so the prose never breaks.

type ToolFactField =
  | 'name'
  | 'tagline'
  | 'pricing' // pricing_type label (Free / Freemium / Paid / Contact)
  | 'starting_price' // cheapest paid tier, e.g. "$20/mo" (or "Free" / "Free, then $20/mo")
  | 'models' // current model list, first few
  | 'github_stars' // formatted, e.g. "72.5k"

type PricingTier = { plan?: string; price?: string }

const PRICING_LABEL: Record<string, string> = {
  free: 'Free',
  freemium: 'Freemium',
  paid: 'Paid',
  contact: 'Contact for pricing',
}

function parsePrice(p: string | undefined): number | null {
  if (!p) return null
  const m = p.replace(/,/g, '').match(/\$\s*([0-9]+(?:\.[0-9]+)?)/)
  return m ? parseFloat(m[1]) : null
}

function startingPrice(pricingType: string | null, tiers: PricingTier[]): string | null {
  const hasFree =
    tiers.some((t) => parsePrice(t.price) === 0) || pricingType === 'free' || pricingType === 'freemium'
  const paid = tiers
    .map((t) => ({ price: t.price, n: parsePrice(t.price) }))
    .filter((t): t is { price: string; n: number } => t.n !== null && t.n > 0)
    .sort((a, b) => a.n - b.n)
  if (paid.length) return hasFree ? `Free, then ${paid[0].price}` : paid[0].price
  if (hasFree) return 'Free'
  if (pricingType === 'contact') return 'Custom pricing'
  return null
}

function fmtStars(n: number | null): string | null {
  if (n == null) return null
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export async function ToolFact({
  slug,
  field,
  fallback,
}: {
  slug: string
  field: ToolFactField
  fallback?: string
}) {
  let value: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('tools')
      .select('name, tagline, pricing_type, pricing_details, models, github_stars')
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle()
    if (data) {
      const d = data as {
        name: string | null
        tagline: string | null
        pricing_type: string | null
        pricing_details: unknown
        models: unknown
        github_stars: unknown
      }
      const tiers = Array.isArray(d.pricing_details) ? (d.pricing_details as PricingTier[]) : []
      switch (field) {
        case 'name':
          value = d.name ?? null
          break
        case 'tagline':
          value = d.tagline ?? null
          break
        case 'pricing':
          value = d.pricing_type ? PRICING_LABEL[d.pricing_type] ?? null : null
          break
        case 'starting_price':
          value = startingPrice(d.pricing_type, tiers)
          break
        case 'models':
          value =
            Array.isArray(d.models) && d.models.length ? (d.models as string[]).slice(0, 4).join(', ') : null
          break
        case 'github_stars':
          value = fmtStars(typeof d.github_stars === 'number' ? d.github_stars : null)
          break
      }
    }
  } catch {
    // DB hiccup — fall back rather than break the whole page render.
    value = null
  }
  return <>{value ?? fallback ?? ''}</>
}
