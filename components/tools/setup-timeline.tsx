import { Clock } from 'lucide-react'

// Phase 3 (2026-05-05): "Setup time + first-value timeline" — concrete ETA
// per persona ("solo creator: ~30 min to first email; agency with 3 brands:
// ~half day"). Sourced from tools.setup_time_text (free-form prose so we
// can carry per-persona breakdowns without over-structuring).

export function SetupTimeline({
  toolName,
  text,
}: {
  toolName: string
  text: string | null | undefined
}) {
  const trimmed = (text ?? '').trim()
  if (!trimmed) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[SetupTimeline] no data for ${toolName} — Phase 4 backfill will populate.`)
    }
    return null
  }
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
        <Clock className="h-5 w-5 text-blue-400" />
        Setup time &amp; first value
      </h2>
      <p className="text-xs text-zinc-500 mb-3">
        How long it actually takes to get something useful out of {toolName} — broken out by persona, not the marketing-page minute.
      </p>
      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{trimmed}</p>
    </section>
  )
}
