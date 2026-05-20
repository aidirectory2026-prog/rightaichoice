// Phase 8.g.7 (2026-05-20) — chart primitives for /admin/insights.
// Pure SVG + Tailwind — no chart library dependency. Server-renderable.

import type { BarRow, LinePoint, MetricResult } from './queries'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

// ── Big number tile ────────────────────────────────────────────────
export function MetricCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">
        {formatNumber(value)}
        {suffix && <span className="ml-1 text-sm text-zinc-400">{suffix}</span>}
      </div>
    </div>
  )
}

export function MetricRow({ metrics, suffixes }: { metrics: MetricResult[]; suffixes?: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} label={m.label} value={m.value} suffix={suffixes?.[m.label]} />
      ))}
    </div>
  )
}

// ── Horizontal bar list ────────────────────────────────────────────
export function BarList({
  title,
  rows,
  emptyHint,
  rowHrefBuilder,
}: {
  title: string
  rows: BarRow[]
  emptyHint?: string
  rowHrefBuilder?: (label: string) => string | null
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 text-sm font-medium text-zinc-300">{title}</div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">
          {emptyHint || 'No data in selected window'}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const pct = max > 0 ? (r.value / max) * 100 : 0
            const href = rowHrefBuilder?.(r.label) ?? null
            const labelContent = (
              <div className="relative z-10 flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <span className="truncate text-zinc-200">{r.label}</span>
                <span className="font-mono text-zinc-400">{formatNumber(r.value)}</span>
              </div>
            )
            return (
              <li key={r.label} className="relative overflow-hidden rounded bg-zinc-950">
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-900/40"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                {href ? (
                  <a href={href} className="block hover:bg-zinc-800/40">
                    {labelContent}
                  </a>
                ) : (
                  labelContent
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── SVG line chart ─────────────────────────────────────────────────
export function LineMini({
  title,
  points,
  height = 80,
}: {
  title: string
  points: LinePoint[]
  height?: number
}) {
  const W = 600
  const H = height
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-2 text-sm font-medium text-zinc-300">{title}</div>
        <div className="py-6 text-center text-xs text-zinc-500">Need ≥2 days of data</div>
      </div>
    )
  }
  const max = Math.max(...points.map((p) => p.value))
  const min = Math.min(...points.map((p) => p.value))
  const range = max - min || 1
  const stepX = W / (points.length - 1)
  const path = points
    .map((p, i) => {
      const x = i * stepX
      const y = H - ((p.value - min) / range) * (H - 20) - 10
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const areaPath = `${path} L${W},${H} L0,${H} Z`
  const total = points.reduce((s, p) => s + p.value, 0)
  const avg = total / points.length

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-medium text-zinc-300">{title}</div>
        <div className="text-xs text-zinc-500">
          {formatNumber(total)} total · avg {avg.toFixed(0)}/day · max {formatNumber(max)}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-20 w-full">
        <path d={areaPath} className="fill-emerald-900/30" />
        <path d={path} className="fill-none stroke-emerald-400" strokeWidth="1.5" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
        <span>{points[0].date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  )
}

// ── Funnel strip ───────────────────────────────────────────────────
export function FunnelStrip({ title, steps }: { title: string; steps: MetricResult[] }) {
  const max = steps.reduce((m, s) => Math.max(m, s.value), 1)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 text-sm font-medium text-zinc-300">{title}</div>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const pctOfMax = max > 0 ? (s.value / max) * 100 : 0
          const pctOfPrev = i === 0 ? 100 : steps[i - 1].value > 0 ? (s.value / steps[i - 1].value) * 100 : 0
          return (
            <div key={s.label}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="capitalize text-zinc-200">{s.label}</span>
                <span className="font-mono text-zinc-400">
                  {formatNumber(s.value)}
                  {i > 0 && (
                    <span className={`ml-2 ${pctOfPrev >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {pctOfPrev.toFixed(0)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-0.5 h-2 overflow-hidden rounded bg-zinc-950">
                <div className="h-full bg-emerald-700" style={{ width: `${pctOfMax}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section heading ────────────────────────────────────────────────
export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 mt-8 border-b border-zinc-800 pb-2">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
    </div>
  )
}
