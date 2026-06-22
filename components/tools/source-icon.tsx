import { sourceLabel } from '@/lib/scrapers/source-labels'

// Phase 12 Bug-3 (2026-06-23) — per-source provenance badges so the sentiment
// report always shows the user WHERE a mention/quote/score came from. A tinted,
// brand-coloured rounded badge with a short brand mark: recognizable, consistent,
// and (crucially) reproducible in the PDF (just a coloured rect + text — no
// font-glyph or external-icon dependency). `sourceMeta()` is the single source of
// truth, reused by the charts and the react-pdf document.

export type SourceMeta = { key: string; label: string; color: string; glyph: string }

const META: Record<string, { label: string; color: string; glyph: string }> = {
  reddit: { label: 'Reddit', color: '#ff4500', glyph: 'r' },
  hn: { label: 'Hacker News', color: '#ff6600', glyph: 'Y' },
  youtube: { label: 'YouTube', color: '#ff0033', glyph: 'YT' },
  producthunt: { label: 'Product Hunt', color: '#da552f', glyph: 'P' },
  appstore: { label: 'App Store', color: '#0a84ff', glyph: 'A' },
  bluesky: { label: 'Bluesky', color: '#1185fe', glyph: 'B' },
  stackoverflow: { label: 'Stack Overflow', color: '#f48024', glyph: 'SO' },
  github: { label: 'GitHub', color: '#9aa4af', glyph: 'GH' },
  lemmy: { label: 'Lemmy', color: '#14b8a6', glyph: 'L' },
  trustpilot: { label: 'Trustpilot', color: '#00b67a', glyph: 'TP' },
  g2: { label: 'G2', color: '#ff492c', glyph: 'G2' },
  google: { label: 'Google', color: '#4285f4', glyph: 'G' },
  twitter: { label: 'X', color: '#9aa4af', glyph: 'X' },
  quora: { label: 'Quora', color: '#b92b27', glyph: 'Q' },
}

// Match either a raw key ('hn') or a human label ('Hacker News').
const BY_ALIAS: Record<string, string> = {}
for (const [key, m] of Object.entries(META)) {
  BY_ALIAS[key] = key
  BY_ALIAS[m.label.toLowerCase()] = key
}

export function sourceMeta(source: string): SourceMeta {
  const raw = (source ?? '').toLowerCase()
  const key = BY_ALIAS[raw] ?? source
  const m = META[key]
  if (m) return { key, ...m }
  // Freeform/unknown source → neutral badge with a short initialism.
  return {
    key: source,
    label: sourceLabel(source),
    color: '#71717a',
    glyph: (source || '?').replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase() || '?',
  }
}

/** Brand-tinted source badge. `size` = px square. */
export function SourceIcon({
  source,
  size = 16,
  withLabel = false,
  className = '',
}: {
  source: string
  size?: number
  withLabel?: boolean
  className?: string
}) {
  const m = sourceMeta(source)
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-[5px] font-bold leading-none"
        style={{
          width: size,
          height: size,
          backgroundColor: `${m.color}22`,
          color: m.color,
          border: `1px solid ${m.color}40`,
          fontSize: Math.round(size * (m.glyph.length > 1 ? 0.42 : 0.52)),
        }}
        title={m.label}
      >
        {m.glyph}
      </span>
      {withLabel && <span className="text-xs font-medium text-zinc-300">{m.label}</span>}
    </span>
  )
}
