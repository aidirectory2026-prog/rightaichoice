import { donutSegments, sparkline, bucketDates, bandColor } from '@/lib/sentiment/chart-geometry'
import { SourceIcon } from '@/components/tools/source-icon'

// Phase 12 Bug-3 (2026-06-23) — hand-rolled SVG charts for the sentiment report.
// No chart dependency; geometry comes from lib/sentiment/chart-geometry.ts so the
// exact same shapes are reproduced in the downloadable PDF.

export type SourceBreakItem = { source: string; label: string; count: number; positivity: number | null }
export type ThemeItem = { theme: string; sources?: string[]; sentiment?: string }

/** Overall-positivity gauge donut with a centred % label. */
export function SentimentDonut({ positivity, size = 132 }: { positivity: number; size?: number }) {
  const stroke = 12
  const r = size / 2 - stroke
  const cx = size / 2
  const cy = size / 2
  const seg = donutSegments([positivity, 100 - positivity], r)[0]
  const color = bandColor(positivity)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${seg.dash} ${seg.rest}`}
          strokeDashoffset={seg.offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white">{positivity}%</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">positive</span>
      </div>
    </div>
  )
}

/** Per-source positivity bars (icon + label + count + %). Provenance + sentiment in one. */
export function SourceSentimentBars({ items }: { items: SourceBreakItem[] }) {
  if (!items?.length) return null
  return (
    <div className="space-y-2.5">
      {items.map((s) => {
        const pct = s.positivity != null ? Math.round(s.positivity * 100) : null
        const color = pct != null ? bandColor(pct) : '#52525b'
        return (
          <div key={s.source} className="flex items-center gap-3">
            <div className="flex w-28 shrink-0 items-center gap-1.5 sm:w-36">
              <SourceIcon source={s.source} size={16} />
              <span className="truncate text-xs text-zinc-300">{s.label}</span>
            </div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full" style={{ width: `${pct ?? 4}%`, backgroundColor: color }} />
            </div>
            <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-zinc-500">
              {s.count} · {pct != null ? `${pct}%` : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Recurring-theme frequency bars: width = how many platforms voiced it, tinted by sentiment. */
export function ThemeBars({ themes }: { themes: ThemeItem[] }) {
  if (!themes?.length) return null
  const max = Math.max(1, ...themes.map((t) => t.sources?.length ?? 1))
  const tint = (s?: string) => (s === 'positive' ? '#10b981' : s === 'critical' ? '#ef4444' : '#a1a1aa')
  return (
    <div className="space-y-3.5">
      {themes.slice(0, 8).map((t, i) => {
        const w = Math.max(8, ((t.sources?.length ?? 1) / max) * 100)
        return (
          <div key={i}>
            <div className="mb-1.5 flex items-start justify-between gap-3">
              <span className="text-sm leading-snug text-zinc-200">{t.theme}</span>
              <span className="flex shrink-0 items-center gap-1 pt-0.5">
                {(t.sources ?? []).slice(0, 4).map((s) => (
                  <SourceIcon key={s} source={s} size={14} />
                ))}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800/70">
              <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: tint(t.sentiment) }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Mention-volume-over-time sparkline (real recency signal from the live mentions). */
export function MomentumSparkline({ dates, height = 52 }: { dates: Array<string | null>; height?: number }) {
  const series = bucketDates(dates, 10)
  if (series.length < 2) return null
  const width = 320
  const { line, area } = sparkline(series, width, height)
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-12 w-full">
      <path d={area} fill="#10b98124" />
      <path d={line} fill="none" stroke="#34d399" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
