'use client'

import Link from 'next/link'
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { analytics } from '@/lib/analytics'

type ViabilityBadgeProps = {
  score: number | null
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  // Phase 8.g.11.a — when toolSlug is passed, badge becomes a clickable link
  // to /viability (anchored to safe-bets / at-risk depending on score) and
  // fires viabilityBadgeClicked.
  toolSlug?: string
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

export function ViabilityBadge({ score, size = 'sm', showLabel = false, toolSlug }: ViabilityBadgeProps) {
  if (score == null) return null

  const { color, bg, label, Icon } = getScoreConfig(score)

  // Phase 8.g.11.a — when toolSlug given, wrap badge in a link to /viability
  // (deep-link to safe-bets vs at-risk based on score) and fire event on click.
  const badgeKind: 'safe_bet' | 'at_risk' | 'rising' =
    score >= 70 ? 'safe_bet' : score >= 40 ? 'rising' : 'at_risk'
  const viabilityHref = badgeKind === 'safe_bet' ? '/viability/safe-bets'
    : badgeKind === 'at_risk' ? '/viability/at-risk'
    : '/viability'

  const inner = (
    <>
      {size === 'sm' && (
        <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${bg} ${color}`} title={`Viability: ${score}/100 — ${label}`}>
          <Icon className="h-3 w-3" />
          {score}
        </span>
      )}
      {size === 'md' && (
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${bg} ${color}`} title={`Viability: ${score}/100 — ${label}`}>
          <Icon className="h-3.5 w-3.5" />
          {score}/100
          {showLabel && <span className="text-[10px] opacity-75">{label}</span>}
        </span>
      )}
      {size === 'lg' && (
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
      )}
    </>
  )

  if (!toolSlug) return inner

  return (
    <Link
      href={viabilityHref}
      onClick={() => analytics.viabilityBadgeClicked(toolSlug, badgeKind)}
      className="cursor-pointer hover:opacity-90 transition-opacity"
    >
      {inner}
    </Link>
  )
}
