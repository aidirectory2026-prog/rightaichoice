'use client'

import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'

// Phase 3 (2026-05-05): 12-month total-cost projection. Reads the existing
// pricing_details JSONB shape — [{plan, price, features:[]}]. Extracts the
// numeric value out of price strings like "$29/mo", "$290/year", "Free",
// "Contact us" and projects 12 months forward. For tools with both
// monthly and annual tiers in pricing_details, picking the annual tier
// shows the implied savings vs. paying monthly.

type PricingTier = {
  plan?: string
  price?: string
  features?: string[]
}

type Cadence = 'monthly' | 'yearly' | 'one-time' | 'free' | 'custom'

type ParsedPrice = {
  amount: number | null   // null = free or contact-sales
  cadence: Cadence
  perUnit: string | null  // "user" | "seat" | … when the price is per-seat
  raw: string
}

// Reject parses that are obviously not a real list price so the 12-month
// projection never shows a nonsense number (Bug-4.3 / C2).
const MAX_SANE_PRICE = 10_000_000

function parsePrice(raw: string | number | undefined | null): ParsedPrice {
  // Phase 4.5 audit fix (2026-05-09): some pricing_details rows store
  // tier.price as a number (e.g. 0, 29) rather than a string ("$29/mo").
  // Without coercion the hydration call crashed with `(e ?? "").trim is
  // not a function` on 8 production pages. String() coerces 0 → "0".
  const s = String(raw ?? '').trim()
  if (!s) return { amount: null, cadence: 'custom', perUnit: null, raw: s }
  const lower = s.toLowerCase()
  if (lower === 'free' || lower === '$0' || lower === '0' || lower.includes('free forever')) {
    return { amount: 0, cadence: 'free', perUnit: null, raw: s }
  }
  if (lower.includes('contact') || lower.includes('custom') || lower.includes('quote') || lower.includes('let’s talk') || lower.includes("let's talk")) {
    return { amount: null, cadence: 'custom', perUnit: null, raw: s }
  }

  // Match the first dollar amount; tolerates "$29", "$29.99", "$29/mo", "$29 /month", "From $29"
  const match = s.match(/\$\s*([\d,]+(?:\.\d+)?)/)
  if (!match) return { amount: null, cadence: 'custom', perUnit: null, raw: s }
  const amount = parseFloat(match[1].replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount < 0 || amount > MAX_SANE_PRICE) {
    return { amount: null, cadence: 'custom', perUnit: null, raw: s }
  }

  // Bug-4.3 / C2: cadence detection. A monthly token ("/mo", "per month")
  // MUST win over the word "annually" — vendors write "$29/mo billed
  // annually", where $29 is the MONTHLY rate, not the annual price. The old
  // logic saw "annually" and reported a $29 annual total (12× under-count).
  const hasMonthly = /\/\s*mo\b|\/\s*month|per\s*month|a\s*month|monthly|\bmo\b/.test(lower)
  const hasYearly = /\/\s*yr\b|\/\s*year|per\s*year|a\s*year|annual/.test(lower)
  const oneTime = /one[-\s]?time|lifetime/.test(lower)

  let cadence: Cadence = 'monthly'
  if (oneTime) cadence = 'one-time'
  else if (hasMonthly) cadence = 'monthly'
  else if (hasYearly) cadence = 'yearly'

  const unitMatch = lower.match(/\/\s*(user|seat|member|editor|agent|host)|per\s*(user|seat|member|editor|agent|host)/)
  const perUnit = unitMatch ? unitMatch[1] || unitMatch[2] : null

  return { amount, cadence, perUnit, raw: s }
}

function annualize(parsed: ParsedPrice): number | null {
  if (parsed.amount == null) return null
  switch (parsed.cadence) {
    case 'free':      return 0
    case 'monthly':   return parsed.amount * 12
    case 'yearly':    return parsed.amount
    case 'one-time':  return parsed.amount
    case 'custom':    return null
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function CostCalculator({ pricingDetails }: { pricingDetails: PricingTier[] | null | undefined }) {
  const tiers = (pricingDetails ?? []).filter((t) => t && (t.plan || t.price))
  const [selectedIdx, setSelectedIdx] = useState(0)

  const parsedTiers = useMemo(
    () => tiers.map((t) => ({ tier: t, parsed: parsePrice(t.price) })),
    [tiers]
  )

  if (parsedTiers.length === 0) return null

  const selected = parsedTiers[Math.min(selectedIdx, parsedTiers.length - 1)]
  const annual = annualize(selected.parsed)
  const unitSuffix = selected.parsed.perUnit ? ` / ${selected.parsed.perUnit}` : ''

  // For monthly tiers, show what 12 months adds up to. For annual tiers,
  // surface the equivalent monthly cost so a buyer can compare like-for-like.
  let monthlyEq: number | null = null
  if (selected.parsed.amount != null) {
    if (selected.parsed.cadence === 'yearly') {
      monthlyEq = selected.parsed.amount / 12
    } else if (selected.parsed.cadence === 'monthly') {
      monthlyEq = selected.parsed.amount
    }
  }

  // Bug-4.3 / C2: when the buyer is looking at a monthly tier, surface that an
  // annual plan is cheaper than paying 12× monthly (most vendors discount the
  // annual commitment). We compare against the cheapest annual-priced tier so
  // the "12-month cost" isn't silently overstated.
  let savingsNote: string | null = null
  if (selected.parsed.cadence === 'monthly' && annual != null && annual > 0) {
    const annualTiers = parsedTiers.filter(
      (p) => p.parsed.cadence === 'yearly' && p.parsed.amount != null && p.parsed.amount > 0
    )
    const cheapest = annualTiers.reduce<typeof annualTiers[number] | null>(
      (best, p) => (!best || (p.parsed.amount as number) < (best.parsed.amount as number) ? p : best),
      null
    )
    if (cheapest && (cheapest.parsed.amount as number) < annual) {
      const save = annual - (cheapest.parsed.amount as number)
      savingsNote = `Annual billing${cheapest.tier.plan ? ` (${cheapest.tier.plan})` : ''} runs ${formatCurrency(
        cheapest.parsed.amount as number
      )}/yr — about ${formatCurrency(save)} less than paying monthly for a year.`
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-emerald-400" />
        12-month cost
      </h2>
      <p className="text-xs text-zinc-500 mb-4">
        Project the real annual outlay, including the implied monthly cost when only an annual tier is published.
      </p>

      <div className="mb-4">
        <label htmlFor="tier-select" className="block text-xs font-medium text-zinc-400 mb-1.5">
          Plan
        </label>
        <select
          id="tier-select"
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
        >
          {parsedTiers.map((p, i) => (
            <option key={i} value={i}>
              {p.tier.plan ?? `Tier ${i + 1}`} — {p.parsed.raw || 'pricing not listed'}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-xs text-zinc-500 mb-1">Annual total</div>
          <div className="text-2xl font-bold text-white">
            {annual == null
              ? '—'
              : annual === 0
              ? 'Free'
              : `${formatCurrency(annual)}${unitSuffix}`}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {selected.parsed.cadence === 'one-time'
              ? 'One-time'
              : selected.parsed.cadence === 'custom'
              ? 'Contact sales for a quote'
              : selected.parsed.perUnit
              ? `Over 12 months, per ${selected.parsed.perUnit}`
              : 'Over 12 months'}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-xs text-zinc-500 mb-1">Effective monthly</div>
          <div className="text-2xl font-bold text-white">
            {monthlyEq == null
              ? '—'
              : monthlyEq === 0
              ? 'Free'
              : `${formatCurrency(monthlyEq)}${unitSuffix}`}
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {selected.parsed.cadence === 'yearly' ? 'Implied — billed annually' : selected.parsed.cadence === 'monthly' ? 'Billed monthly' : '—'}
          </div>
        </div>
      </div>

      {savingsNote && (
        <p className="mt-3 rounded-lg border border-emerald-900/40 bg-emerald-950/15 px-3 py-2 text-xs text-emerald-300">
          {savingsNote}
        </p>
      )}

      <p className="mt-3 text-xs text-zinc-600 leading-relaxed">
        Vendor list price only. Add-on usage, seat overages, and contract minimums are surfaced under{' '}
        <a href="#hidden-costs" className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2">
          Hidden costs &amp; gotchas
        </a>
        .
      </p>
    </section>
  )
}
