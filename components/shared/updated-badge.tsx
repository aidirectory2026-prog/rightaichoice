/**
 * Universal-propagation badge (B2).
 *
 * A single "Updated <date>" pill shown on every surface that renders a tool's
 * user-visible data — compare pages and the best/for/stacks/category hubs.
 * The date is the canonical pages_freshness.last_changed_at for that page path
 * (fetched server-side via lib/seo/freshness.ts getLastChangedAt), so when a
 * tool changes and the freshness cascade fans out, every referencing surface
 * reflects the real change date — not a fake `new Date()`.
 *
 * SEO-friendly: emits a machine-readable <time dateTime>. Pure presentational,
 * no data fetching. Returns null on the pre-2000 epoch fallback so empty
 * pages_freshness rows don't render "1970".
 *
 * This wraps the existing LastUpdated pill so the badge style stays identical
 * to the tool/compare page badge — one source of truth for the visual.
 */
import { LastUpdated } from '@/components/seo/last-updated'

type Props = {
  date: Date | string | null | undefined
  className?: string
  /** Defaults to "Updated". Pass "Last updated" / "Reviewed" to match local copy. */
  prefix?: string
}

export function UpdatedBadge({ date, className, prefix = 'Updated' }: Props) {
  const d = date == null ? null : date instanceof Date ? date : new Date(date)
  return <LastUpdated date={d} prefix={prefix} className={className} />
}
