/**
 * 1.1 freshness-cascade — practice G.
 *
 * "Reviewed by our team on <date>" badge — E-E-A-T signal that pairs with
 * the LastUpdated chip. Same date source (pages_freshness.last_changed_at)
 * so Google can't catch us showing different "updated" / "reviewed" dates
 * on the same URL.
 *
 * Pure presentational; the page renderer passes in the Date. Returns null
 * for fallback / unset dates so we never claim a 1970 review.
 */
import { ShieldCheck } from 'lucide-react'

type Props = {
  date: Date | null | undefined
  className?: string
  reviewer?: string
}

export function ReviewedByOurTeam({
  date,
  className = '',
  reviewer = 'our team',
}: Props) {
  if (!isMeaningfulDate(date)) return null

  const iso = date!.toISOString()
  const human = formatIsoDate(iso)

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300 ${className}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      <span>
        Reviewed by {reviewer} on{' '}
        <time dateTime={iso} className="font-semibold">
          {human}
        </time>
      </span>
    </div>
  )
}

function isMeaningfulDate(d: Date | null | undefined): boolean {
  if (!d) return false
  const t = d.getTime()
  if (!Number.isFinite(t)) return false
  return t > new Date('2000-01-01').getTime()
}

function formatIsoDate(iso: string): string {
  return iso.slice(0, 10)
}
