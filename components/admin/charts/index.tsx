// Phase 10.4.3 — shared admin chart kit, extracted verbatim from
// app/admin/insights/page.tsx (pure extraction: identical props, markup and
// classes — the Phase-4 gate proves zero numeric drift). Server-renderable:
// plain HTML + Tailwind, no chart library. Phase 5 migrates the remaining
// admin pages onto this kit.

/** { label, value } — structurally identical to insights' MetricResult/BarRow. */
export interface ChartDatum {
  label: string
  value: number
}

export interface ChartPoint {
  date: string // YYYY-MM-DD
  value: number
}

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function MetricCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">
        {fmt(value)}
        {suffix ? <span className="ml-1 text-sm text-zinc-400">{suffix}</span> : null}
      </div>
    </div>
  )
}

export function MetricRow({ metrics, suffixes }: { metrics: ChartDatum[]; suffixes?: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((m, i) => (
        <MetricCard key={`${m.label}-${i}`} label={m.label} value={m.value} suffix={suffixes?.[m.label]} />
      ))}
    </div>
  )
}

export function BarList({
  title, rows, emptyHint, rowHrefBuilder,
}: {
  title: string
  rows: ChartDatum[]
  emptyHint?: string
  rowHrefBuilder?: (label: string) => string | null
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 text-sm font-medium text-zinc-300">{title}</div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-zinc-500">{emptyHint || 'No data in selected window'}</div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => {
            const pct = max > 0 ? (r.value / max) * 100 : 0
            const href = rowHrefBuilder?.(r.label) ?? null
            const inner = (
              <div className="relative z-10 flex items-center justify-between gap-2 px-2 py-1.5 text-xs">
                <span className="truncate text-zinc-200">{r.label || '(empty)'}</span>
                <span className="font-mono text-zinc-400">{fmt(r.value)}</span>
              </div>
            )
            return (
              <li key={`${r.label}-${i}`} className="relative overflow-hidden rounded bg-zinc-950">
                <div className="absolute inset-y-0 left-0 bg-emerald-900/40" style={{ width: `${pct}%` }} aria-hidden />
                {href ? <a href={href} className="block hover:bg-zinc-800/40">{inner}</a> : inner}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function FunnelStrip({ title, steps }: { title: string; steps: ChartDatum[] }) {
  const max = steps.reduce((m, s) => Math.max(m, s.value), 1)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 text-sm font-medium text-zinc-300">{title}</div>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const pctOfMax = max > 0 ? (s.value / max) * 100 : 0
          const prev = i === 0 ? 0 : steps[i - 1].value
          const pctOfPrev = i === 0 ? 100 : prev > 0 ? (s.value / prev) * 100 : 0
          return (
            <div key={`${s.label}-${i}`}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="capitalize text-zinc-200">{s.label}</span>
                <span className="font-mono text-zinc-400">
                  {fmt(s.value)}
                  {i > 0 ? (
                    <span className={`ml-2 ${pctOfPrev >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {pctOfPrev.toFixed(0)}%
                    </span>
                  ) : null}
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

export function DailyChart({ title, points }: { title: string; points: ChartPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-2 text-sm font-medium text-zinc-300">{title}</div>
        <div className="py-6 text-center text-xs text-zinc-500">Need ≥2 days of data</div>
      </div>
    )
  }
  const max = Math.max(...points.map((p) => p.value), 1)
  const total = points.reduce((s, p) => s + p.value, 0)
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-sm font-medium text-zinc-300">{title}</div>
        <div className="text-xs text-zinc-500">{fmt(total)} total · max {fmt(max)}</div>
      </div>
      <div className="flex items-end gap-1 h-20">
        {points.map((p, i) => {
          const h = max > 0 ? (p.value / max) * 100 : 0
          return (
            <div key={`${p.date}-${i}`} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${p.date}: ${p.value}`}>
              <div className="w-full bg-emerald-700/70 rounded-sm" style={{ height: `${h}%` }} />
              <span className="text-[9px] text-zinc-600">{p.date.slice(5)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3 mt-8 border-b border-zinc-800 pb-2">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
    </div>
  )
}
