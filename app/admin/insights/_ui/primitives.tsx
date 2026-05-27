import Link from 'next/link'
import type { ReactNode } from 'react'

export function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '0'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 10_000) return (n / 1_000).toFixed(1) + 'K'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '0%'
  return n.toFixed(1) + '%'
}

export function relativeTime(iso: string | Date): string {
  const t = typeof iso === 'string' ? new Date(iso).getTime() : iso.getTime()
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '🌐'
  return code
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)))
}

export function Card({ title, subtitle, action, children }: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-2.5">
          <div>
            {title && <div className="text-sm font-medium text-zinc-200">{title}</div>}
            {subtitle && <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function BigNumber({
  label, value, suffix, hint, tone = 'default',
}: {
  label: string
  value: number | string
  suffix?: string
  hint?: string
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'accent'
}) {
  const toneClass = {
    default: 'text-white',
    good: 'text-emerald-300',
    warn: 'text-amber-300',
    bad: 'text-rose-300',
    accent: 'text-sky-300',
  }[tone]
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div className={`mt-2 text-3xl font-semibold ${toneClass} tabular-nums`}>
        {typeof value === 'number' ? fmt(value) : value}
        {suffix && <span className="ml-1 text-sm text-zinc-400 font-normal">{suffix}</span>}
      </div>
      {hint && <div className="mt-1 text-[11px] text-zinc-500">{hint}</div>}
    </div>
  )
}

/**
 * Legacy days-only picker, kept for backwards compat. New code should use
 * `<UnifiedRangePicker />` (re-exported from components/admin/range-picker)
 * which supports Today / Yesterday / 7d / 14d / 30d / 90d / WTD / MTD /
 * Custom calendar — all URL-driven.
 */
export function RangePicker({
  current, basePath, includeBots,
}: {
  current: number
  basePath: string
  includeBots?: boolean
}) {
  const windows = [1, 7, 30, 90] as const
  const botParam = includeBots ? '&include_bots=1' : ''
  return (
    <div className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
      {windows.map((w) => (
        <Link
          key={w}
          href={`${basePath}?days=${w}${botParam}`}
          className={`rounded px-2.5 py-1 font-medium transition-colors ${
            w === current
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          {w === 1 ? 'Today (24h)' : `${w}d`}
        </Link>
      ))}
    </div>
  )
}

export function BotToggle({ basePath, days, includeBots }: { basePath: string; days: number; includeBots: boolean }) {
  return (
    <Link
      href={`${basePath}?days=${days}${includeBots ? '' : '&include_bots=1'}`}
      className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
        includeBots
          ? 'border-amber-800 bg-amber-950/40 text-amber-300'
          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
      }`}
    >
      {includeBots ? 'Including bots' : 'Humans only'}
    </Link>
  )
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-2 text-zinc-600">{icon}</div>}
      <div className="text-sm text-zinc-400">{title}</div>
      {hint && <div className="mt-1 text-xs text-zinc-600 max-w-md">{hint}</div>}
    </div>
  )
}

export function parseDays(input: string | undefined, fallback: 1 | 7 | 30 | 90 = 7): 1 | 7 | 30 | 90 {
  const n = Number(input)
  if (n === 1 || n === 7 || n === 30 || n === 90) return n
  return fallback
}
