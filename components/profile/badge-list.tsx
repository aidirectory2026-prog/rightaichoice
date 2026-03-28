import { Award } from 'lucide-react'

const badgeConfig: Record<string, { label: string; color: string; emoji: string }> = {
  contributor: {
    label: 'Contributor',
    color: 'bg-blue-950 text-blue-400 border-blue-800',
    emoji: '🛠',
  },
  expert: {
    label: 'Expert',
    color: 'bg-purple-950 text-purple-400 border-purple-800',
    emoji: '🧠',
  },
  top_reviewer: {
    label: 'Top Reviewer',
    color: 'bg-amber-950 text-amber-400 border-amber-800',
    emoji: '⭐',
  },
  early_adopter: {
    label: 'Early Adopter',
    color: 'bg-emerald-950 text-emerald-400 border-emerald-800',
    emoji: '🚀',
  },
}

type Badge = { badge: string; awarded_at: string }

export function BadgeList({ badges }: { badges: Badge[] }) {
  if (badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((b) => {
        const config = badgeConfig[b.badge]
        if (!config) return null
        return (
          <span
            key={b.badge}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.color}`}
          >
            <span>{config.emoji}</span>
            {config.label}
          </span>
        )
      })}
    </div>
  )
}

export function BadgeIcon({ badge }: { badge: string }) {
  const config = badgeConfig[badge]
  if (!config) return <Award className="h-4 w-4 text-zinc-500" />
  return <span title={config.label}>{config.emoji}</span>
}
