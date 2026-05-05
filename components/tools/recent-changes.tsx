import { Clock4 } from 'lucide-react'

// Phase 3 (2026-05-05): "Recent material changes" — pricing changes, brand
// changes, ownership changes, deprecations. Sourced from
// tools.recent_changes (text[]) populated by Phase 4. Each entry is
// expected to carry a date prefix in the string itself, e.g.
//   "2026-04-12 — Removed the $9 Personal tier; cheapest paid plan is now $25."
// We intentionally don't structure date as a separate field so the editor
// can write nuance into the prose without a schema dance.

export function RecentChanges({
  toolName,
  changes,
}: {
  toolName: string
  changes: string[] | null | undefined
}) {
  const items = (changes ?? []).filter(Boolean)
  if (items.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[RecentChanges] no data for ${toolName} — Phase 4 backfill will populate.`)
    }
    return null
  }
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Clock4 className="h-5 w-5 text-amber-400" />
        Recent material changes
      </h2>
      <p className="text-xs text-zinc-500 mb-3">
        Pricing, brand, ownership, or deprecation changes worth knowing before you commit. Most-recent first.
      </p>
      <ul className="space-y-2">
        {items.slice(0, 6).map((item, i) => (
          <li key={i} className="text-sm text-zinc-300 leading-relaxed flex gap-2">
            <span className="text-amber-500 mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
