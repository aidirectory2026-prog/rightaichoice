// Phase 12 Bug-3 (2026-06-23) — pure chart geometry, no React. The SAME math
// drives the web `<svg>` charts (sentiment-charts.tsx) AND the react-pdf `<Svg>`
// charts (sentiment-report-pdf.tsx), so a chart is defined once and renders
// identically on screen and in the downloadable PDF.

export type DonutSegment = { dash: number; rest: number; offset: number; frac: number }

/**
 * Stroke-dash donut segments. Render each as a <circle r={radius}
 * strokeDasharray={`${dash} ${rest}`} strokeDashoffset={offset}/> inside an SVG
 * rotated -90° around its centre, so segments start at 12 o'clock and run
 * clockwise. Works in both DOM SVG and @react-pdf/renderer.
 */
export function donutSegments(values: number[], radius: number): DonutSegment[] {
  const circ = 2 * Math.PI * radius
  const total = values.reduce((s, v) => s + Math.max(0, v), 0) || 1
  let before = 0
  return values.map((v) => {
    const frac = Math.max(0, v) / total
    const seg: DonutSegment = { dash: frac * circ, rest: circ - frac * circ, offset: -(before * circ), frac }
    before += frac
    return seg
  })
}

export type SparkPath = { line: string; area: string; points: ReadonlyArray<readonly [number, number]> }

/** Sparkline line + closed area paths for a series of values in a w×h box. */
export function sparkline(values: number[], width: number, height: number, pad = 2): SparkPath {
  const n = values.length
  if (n === 0) return { line: '', area: '', points: [] }
  const max = Math.max(1, ...values)
  const stepX = n > 1 ? (width - pad * 2) / (n - 1) : 0
  const points = values.map((v, i) => {
    const x = pad + i * stepX
    const y = height - pad - (v / max) * (height - pad * 2)
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const
  })
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ')
  const last = points[n - 1]
  const first = points[0]
  const baseY = Number((height - pad).toFixed(2))
  const area = n > 1 ? `${line} L${last[0]} ${baseY} L${first[0]} ${baseY} Z` : ''
  return { line, area, points }
}

/** Bucket ISO date strings into `buckets` equal time slices (oldest→newest) and
 *  return the count per bucket — the momentum/volume-over-time series. */
export function bucketDates(dates: Array<string | null | undefined>, buckets = 8): number[] {
  const ts = dates
    .map((d) => (d ? Date.parse(d) : NaN))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b)
  if (ts.length === 0) return []
  const min = ts[0]
  const max = ts[ts.length - 1]
  if (max === min) return [ts.length]
  const span = max - min
  const out = new Array(buckets).fill(0)
  for (const t of ts) {
    let idx = Math.floor(((t - min) / span) * buckets)
    if (idx >= buckets) idx = buckets - 1
    if (idx < 0) idx = 0
    out[idx] += 1
  }
  return out
}

/** Overall positivity 0-100 from the model's per-source sentiment_breakdown
 *  (0-1 each). Falls back to the categorical score when no breakdown exists. */
export function overallPositivity(
  breakdown: Record<string, number> | undefined,
  fallback: 'positive' | 'mixed' | 'negative',
): number {
  const vals = Object.values(breakdown ?? {}).filter((v) => typeof v === 'number')
  if (vals.length) return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100)
  return fallback === 'positive' ? 78 : fallback === 'negative' ? 30 : 55
}

/** Sentiment band → hex (shared web + PDF; matches the emerald/amber/red theme). */
export function bandColor(pct: number): string {
  if (pct >= 67) return '#10b981' // emerald-500
  if (pct >= 45) return '#f59e0b' // amber-500
  return '#ef4444' // red-500
}
