'use client'

import { Zap, DollarSign, Clock, Layers } from 'lucide-react'

// Phase 9 Stage 3 (2026-05-16): "Quick wins" strip rendered ABOVE the
// plan title so the user lands on the value (tool count + cost + time
// to first value) before reading anything else. Uses fields the API
// already emits; renders nothing for the fields that are missing.

type Props = {
  stageCount: number
  toolCount: number
  monthlyCostUsd?: number
  timeToFirstValue?: string
}

export function PlanQuickWinsStrip({ stageCount, toolCount, monthlyCostUsd, timeToFirstValue }: Props) {
  const items: Array<{ icon: React.ReactNode; label: string }> = [
    {
      icon: <Layers className="h-3.5 w-3.5" />,
      label: `${toolCount} tool${toolCount !== 1 ? 's' : ''} · ${stageCount} stage${stageCount !== 1 ? 's' : ''}`,
    },
  ]
  if (monthlyCostUsd !== undefined) {
    items.push({
      icon: <DollarSign className="h-3.5 w-3.5" />,
      label: monthlyCostUsd === 0 ? 'Free monthly' : `~$${monthlyCostUsd}/mo`,
    })
  }
  if (timeToFirstValue) {
    items.push({
      icon: <Clock className="h-3.5 w-3.5" />,
      label: timeToFirstValue,
    })
  }

  return (
    <div className="mb-3 inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-950/40 px-3 py-1 text-[11px] font-semibold text-emerald-300">
        <Zap className="h-3.5 w-3.5" />
        Quick wins
      </span>
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-900/60 px-3 py-1 text-[11px] font-medium text-zinc-200"
        >
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  )
}
