import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Phase 10 #69 — duplicate slugify removed (had no importers and diverged from
// the canonical lib/utils/slugify.ts, risking mismatched slugs). Use
// `@/lib/utils/slugify` everywhere.

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(date).toLocaleDateString()
}

export function pricingLabel(type: string): string {
  const labels: Record<string, string> = {
    free: 'Free',
    freemium: 'Freemium',
    paid: 'Paid',
    contact: 'Contact Sales',
  }
  return labels[type] ?? type
}

// Phase 12 Bug-2 follow-up — a concise "from $X/mo" starting price derived from
// the structured pricing_details tiers (the cheapest tier with a real dollar
// amount). Returns null for free-only / contact-sales-only tools (the badge
// already says it) so the card stays clean. Preserves the tier's own price
// string ("$20/mo", "$15/user/mo") rather than re-formatting.
export function startingPriceLabel(details: unknown): string | null {
  const tiers = Array.isArray(details) ? (details as Array<{ plan?: string; price?: string }>) : []
  let best: { num: number; raw: string } | null = null
  for (const t of tiers) {
    const raw = (t?.price ?? '').trim()
    const m = raw.match(/\$\s*([\d,]+(?:\.\d+)?)/)
    if (!m) continue
    const num = parseFloat(m[1].replace(/,/g, ''))
    if (!Number.isFinite(num) || num <= 0) continue
    if (!best || num < best.num) best = { num, raw }
  }
  return best ? `from ${best.raw}` : null
}

export function pricingColor(type: string): string {
  const colors: Record<string, string> = {
    free: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
    freemium: 'bg-blue-950 text-blue-400 border border-blue-800',
    paid: 'bg-amber-950 text-amber-400 border border-amber-800',
    contact: 'bg-purple-950 text-purple-400 border border-purple-800',
  }
  return colors[type] ?? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
}
