import type { LucideIcon } from 'lucide-react'

type Tint = 'emerald' | 'sky' | 'violet' | 'amber'

const TINT: Record<Tint, { border: string; bg: string; icon: string; glow: string }> = {
  emerald: {
    border: 'border-emerald-800/50',
    bg: 'bg-gradient-to-b from-emerald-900/40 to-emerald-950/60',
    icon: 'text-emerald-300',
    glow: 'shadow-[0_0_24px_-8px_rgba(52,211,153,0.45)]',
  },
  sky: {
    border: 'border-sky-800/50',
    bg: 'bg-gradient-to-b from-sky-900/40 to-sky-950/60',
    icon: 'text-sky-300',
    glow: 'shadow-[0_0_24px_-8px_rgba(56,189,248,0.45)]',
  },
  violet: {
    border: 'border-violet-800/50',
    bg: 'bg-gradient-to-b from-violet-900/40 to-violet-950/60',
    icon: 'text-violet-300',
    glow: 'shadow-[0_0_24px_-8px_rgba(167,139,250,0.45)]',
  },
  amber: {
    border: 'border-amber-800/50',
    bg: 'bg-gradient-to-b from-amber-900/40 to-amber-950/60',
    icon: 'text-amber-300',
    glow: 'shadow-[0_0_24px_-8px_rgba(251,191,36,0.45)]',
  },
}

type SectionHeaderProps = {
  icon: LucideIcon
  title: string
  subtitle?: string
  tint?: Tint
  align?: 'center' | 'left'
  className?: string
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  tint = 'emerald',
  align = 'center',
  className = '',
}: SectionHeaderProps) {
  const t = TINT[tint]
  const isCenter = align === 'center'

  const badge = (
    <div
      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${t.border} ${t.bg} ${t.glow}`}
      aria-hidden="true"
    >
      <Icon className={`h-5 w-5 ${t.icon}`} strokeWidth={1.75} />
    </div>
  )

  if (isCenter) {
    return (
      <div className={`text-center flex flex-col items-center ${className}`}>
        <div className="mb-4">{badge}</div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {badge}
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
    </div>
  )
}
