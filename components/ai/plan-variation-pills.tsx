'use client'

import { DollarSign, Package, Crown, Zap } from 'lucide-react'

// Phase 9 Stage 4 (2026-05-16): four "re-plan as..." pills shown after
// the initial plan renders. Clicking a pill re-fires the planner with
// the corresponding variant constraint and cache-keys per variant so
// repeat clicks are sub-200ms.
//
// The active variant pill is highlighted so the user knows which
// constraint is currently shaping the plan.

export type PlanVariant = 'budget' | 'open_source' | 'premium' | 'fast_setup'

const VARIANTS: Array<{
  key: PlanVariant
  label: string
  icon: React.ReactNode
  color: string
}> = [
  { key: 'budget', label: 'Budget mode', icon: <DollarSign className="h-3.5 w-3.5" />, color: 'emerald' },
  { key: 'open_source', label: 'Open-source only', icon: <Package className="h-3.5 w-3.5" />, color: 'cyan' },
  { key: 'premium', label: 'Premium picks', icon: <Crown className="h-3.5 w-3.5" />, color: 'amber' },
  { key: 'fast_setup', label: 'Fastest setup', icon: <Zap className="h-3.5 w-3.5" />, color: 'violet' },
]

type Props = {
  active?: PlanVariant | null
  onPick: (variant: PlanVariant | null) => void
  disabled?: boolean
}

export function PlanVariationPills({ active, onPick, disabled }: Props) {
  return (
    <div data-variations-pills className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Try a different shape</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Re-plan with a constraint. Each variation explores a different trade-off.
          </p>
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onPick(null)}
            disabled={disabled}
            className="text-[11px] text-zinc-400 hover:text-emerald-300 disabled:opacity-50"
          >
            Reset to default
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {VARIANTS.map((v) => {
          const isActive = active === v.key
          const colorClass = {
            emerald: isActive
              ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-200'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-emerald-700/40 hover:text-emerald-300',
            cyan: isActive
              ? 'border-cyan-500/60 bg-cyan-950/60 text-cyan-200'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-cyan-700/40 hover:text-cyan-300',
            amber: isActive
              ? 'border-amber-500/60 bg-amber-950/60 text-amber-200'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-amber-700/40 hover:text-amber-300',
            violet: isActive
              ? 'border-violet-500/60 bg-violet-950/60 text-violet-200'
              : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-violet-700/40 hover:text-violet-300',
          }[v.color] ?? ''
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => onPick(isActive ? null : v.key)}
              disabled={disabled}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${colorClass}`}
            >
              {v.icon}
              {v.label}
              {isActive && <span className="ml-1 text-[10px] opacity-80">· active</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
