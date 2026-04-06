import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'

type ViabilityBadgeProps = {
  score: number | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

function getScoreConfig(score: number) {
  if (score >= 70) {
    return {
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-800/50',
      label: 'Safe Bet',
      Icon: ShieldCheck,
    }
  }
  if (score >= 40) {
    return {
      color: 'text-yellow-400',
      bg: 'bg-yellow-950/30 border-yellow-800/50',
      label: 'Monitor',
      Icon: ShieldAlert,
    }
  }
  return {
    color: 'text-red-400',
    bg: 'bg-red-950/30 border-red-800/50',
    label: 'At Risk',
    Icon: ShieldX,
  }
}

export function ViabilityBadge({ score, size = 'sm', showLabel = false }: ViabilityBadgeProps) {
  if (score == null) return null

  const { color, bg, label, Icon } = getScoreConfig(score)

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${bg} ${color}`}
        title={`Viability: ${score}/100 — ${label}`}
      >
        <Icon className="h-3 w-3" />
        {score}
      </span>
    )
  }

  if (size === 'md') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${bg} ${color}`}
        title={`Viability: ${score}/100 — ${label}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {score}/100
        {showLabel && <span className="text-[10px] opacity-75">{label}</span>}
      </span>
    )
  }

  // lg — used on tool detail page
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 ${bg}`}>
      <Icon className={`h-5 w-5 ${color}`} />
      <div>
        <span className={`text-lg font-bold ${color}`}>{score}</span>
        <span className="text-xs text-zinc-500">/100</span>
      </div>
      {showLabel && (
        <span className={`ml-1 text-sm font-medium ${color}`}>{label}</span>
      )}
    </div>
  )
}
