import { Scale } from 'lucide-react'

// Phase 3 (2026-05-05): "Pricing-power match" — at which company stage /
// team size the pricing actually makes sense vs. cheaper or better-priced
// peers in the same category. Sourced from tools.pricing_power_text.

export function PricingPowerMatch({
  toolName,
  text,
}: {
  toolName: string
  text: string | null | undefined
}) {
  const trimmed = (text ?? '').trim()
  if (!trimmed) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[PricingPowerMatch] no data for ${toolName} — Phase 4 backfill will populate.`)
    }
    return null
  }
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Scale className="h-5 w-5 text-emerald-400" />
        Where the pricing makes sense
      </h2>
      <p className="text-xs text-zinc-500 mb-3">
        The company stage and team size where {toolName}&apos;s pricing actually pencils out — and where peers do it cheaper.
      </p>
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{trimmed}</p>
    </section>
  )
}
