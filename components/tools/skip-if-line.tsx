// Phase 3 (2026-05-05): "Skip this if …" — single honest sentence
// describing who should NOT pick this tool. The most professional
// credibility builder on the page; deliberately styled as a small
// inline strip (not a full section) so it reads as part of the
// editorial verdict band, not a separate concern.

export function SkipIfLine({
  toolName,
  text,
}: {
  toolName: string
  text: string | null | undefined
}) {
  const trimmed = (text ?? '').trim()
  if (!trimmed) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[SkipIfLine] no data for ${toolName} — Phase 4 backfill will populate.`)
    }
    return null
  }
  return (
    <div className="rounded-lg border-l-2 border-zinc-600 bg-zinc-900/30 px-4 py-2.5">
      <p className="text-sm text-zinc-400 leading-relaxed">
        <span className="font-medium text-zinc-200">Skip {toolName} if </span>
        {trimmed}
      </p>
    </div>
  )
}
