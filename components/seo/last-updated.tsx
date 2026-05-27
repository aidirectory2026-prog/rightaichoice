/**
 * 1.1 freshness-cascade — practice B.
 *
 * Renders a small inline "Last updated <YYYY-MM-DD>" pill near the page
 * title. Date string is the canonical `last_changed_at` from
 * pages_freshness, fetched server-side by the page renderer via
 * lib/seo/freshness.ts and passed in as a Date.
 *
 * Pure presentational. No data fetching. Returns null when given a
 * pre-2000 epoch fallback so empty rows don't render "1970".
 */
import { Clock } from 'lucide-react'

type Props = {
  date: Date | null | undefined
  className?: string
  prefix?: string
}

export function LastUpdated({
  date,
  className = '',
  prefix = 'Last updated',
}: Props) {
  if (!isMeaningfulDate(date)) return null

  const iso = date!.toISOString()
  const human = formatIsoDate(iso)

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-zinc-400 ${className}`}
    >
      <Clock className="h-3 w-3" aria-hidden />
      <span>
        {prefix}{' '}
        <time dateTime={iso} className="font-medium text-zinc-300">
          {human}
        </time>
      </span>
    </span>
  )
}

function isMeaningfulDate(d: Date | null | undefined): boolean {
  if (!d) return false
  const t = d.getTime()
  if (!Number.isFinite(t)) return false
  // Treat anything before 2000 as a fallback / unset value.
  return t > new Date('2000-01-01').getTime()
}

function formatIsoDate(iso: string): string {
  // YYYY-MM-DD slice — locale-independent, stable for crawlers and humans.
  return iso.slice(0, 10)
}
