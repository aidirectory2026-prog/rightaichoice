// Phase 12 Bug-4.7 (2026-06-27): render the Limitations field as icon-led
// cards instead of one grey paragraph. Splits the stored text on explicit
// lines/bullets, falling back to sentence-splitting for a single paragraph,
// so the same `limitations` data reads as a scannable list of gotchas. Pure
// server component — works for every tool with no data change.

import { AlertTriangle } from 'lucide-react'

function splitLimitations(text: string): string[] {
  const t = text.trim()
  // Prefer explicit lines / bullet markers.
  let parts = t
    .split(/\n+/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
  // Single paragraph → split into sentences so it still becomes a list.
  if (parts.length <= 1) {
    parts = t
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  return parts
}

export function LimitationsList({ text }: { text: string | null | undefined }) {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return null
  const items = splitLimitations(trimmed)
  // Nothing gained from a one-item "list" — keep the prose.
  if (items.length <= 1) {
    return <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{trimmed}</p>
  }
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 rounded-lg border border-amber-900/30 bg-amber-950/10 px-3.5 py-3 text-sm text-zinc-300 leading-relaxed"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}
