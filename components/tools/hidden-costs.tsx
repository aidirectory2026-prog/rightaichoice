import { AlertTriangle } from 'lucide-react'

// Phase 3 (2026-05-05): "Hidden costs & gotchas" — overage rates, surprise
// add-ons, contract minimums, mid-tier paywalls. Sourced from the
// structured tools.hidden_costs column populated by Phase 4 (separate
// from the synthesized hidden-costs inside SentimentSynthesis, which
// surfaces what users mention in the wild).

export function HiddenCosts({
  toolName,
  hiddenCosts,
}: {
  toolName: string
  hiddenCosts: string[] | null | undefined
}) {
  const items = (hiddenCosts ?? []).filter(Boolean)
  if (items.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[HiddenCosts] no data for ${toolName} — Phase 4 backfill will populate.`)
    }
    return null
  }
  return (
    <section id="hidden-costs" className="rounded-xl border border-yellow-900/30 bg-yellow-950/5 p-5">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-400" />
        Hidden costs &amp; gotchas
      </h2>
      <p className="text-xs text-zinc-500 mb-3">
        What the public pricing page doesn&apos;t put in bold. Captured from pricing-page footnotes, contract terms, and recurring complaints.
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 rounded-lg border border-yellow-900/30 bg-yellow-950/10 px-3.5 py-3 text-sm text-zinc-300 leading-relaxed"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
