// Phase 8.d.6 / Phase 9 — shared date-range helpers for admin pages.
// One URL convention. Two forms:
//   preset: ?range=today|yesterday|7d|14d|30d|90d|wtd|mtd
//   custom: ?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// "Today" and "yesterday" + "wtd" + "mtd" are CALENDAR-day boundaries in the
// admin's local timezone (default Asia/Kolkata, since the founder runs admin
// from IST). 7d/14d/30d/90d remain rolling N×24h windows because their
// presence as legacy URLs (?range=7d) shouldn't silently switch meaning.

const ADMIN_TZ = process.env.NEXT_PUBLIC_ADMIN_TZ || 'Asia/Kolkata'

export type RangeKey =
  | 'today'
  | 'yesterday'
  | '7d'
  | '14d'
  | '30d'
  | '90d'
  | 'wtd'
  | 'mtd'
  | 'custom'

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  '14d': 'Last 14 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  wtd: 'Week to date',
  mtd: 'Month to date',
  custom: 'Custom',
}

// Presets that map to a rolling N×24h cutoff (legacy + intentional).
const ROLLING_HOURS: Partial<Record<RangeKey, number>> = {
  '7d': 24 * 7,
  '14d': 24 * 14,
  '30d': 24 * 30,
  '90d': 24 * 90,
}

export type RangeSelection = {
  key: RangeKey
  cutoffISO: string         // start of window (>= this)
  endCutoffISO: string      // end of window (< this); ISO of "now" for non-custom
  label: string
  /** True for calendar-anchored presets (today/yesterday/wtd/mtd/custom). */
  calendarAnchored: boolean
  /** Days span (for legacy callers that need an int). */
  days: number
}

/** Compute YYYY-MM-DD parts for a date in a specific IANA timezone. */
function partsInTz(date: Date, tz: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '00' : parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** Build a Date that represents the given wall-clock instant in `tz`. */
function dateFromTzWallClock(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, tz: string): Date {
  // Use the trick: format an arbitrary UTC date as wall-clock in tz, compute
  // offset between the desired wall-clock and the displayed one, then shift.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second)
  const guessDate = new Date(utcGuess)
  const displayed = partsInTz(guessDate, tz)
  const displayedUtc = Date.UTC(displayed.year, displayed.month - 1, displayed.day, displayed.hour, displayed.minute, displayed.second)
  const offset = utcGuess - displayedUtc
  return new Date(utcGuess + offset)
}

/** Midnight (start) of the given calendar day in `tz`, as a UTC Date. */
function startOfDayInTz(date: Date, tz: string): Date {
  const { year, month, day } = partsInTz(date, tz)
  return dateFromTzWallClock(year, month, day, 0, 0, 0, tz)
}

/** Add N calendar days to a Date — purely arithmetic on UTC ms. */
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000)
}

export function parseRange(sp: { range?: string; from?: string; to?: string; days?: string }): RangeSelection {
  const now = new Date()
  const tz = ADMIN_TZ

  // Backwards-compat: legacy insights URL convention `?days=N`. Map to the
  // nearest preset key. If the value isn't a known rolling preset, fall
  // through to range parsing.
  if (sp.days && !sp.range && !sp.from && !sp.to) {
    const n = Number(sp.days)
    const mapped: Record<number, RangeKey> = { 1: 'today', 7: '7d', 14: '14d', 30: '30d', 90: '90d' }
    if (mapped[n]) return parseRange({ range: mapped[n] })
  }

  // Custom: from/to take precedence
  const hasCustom = sp.from || sp.to
  if (hasCustom) {
    // Treat `from` and `to` as calendar dates in admin TZ.
    // Default `from` = today (TZ), default `to` = today (TZ).
    const todayParts = partsInTz(now, tz)
    let fromDate: Date
    let toDate: Date
    if (sp.from) {
      const [y, m, d] = sp.from.split('-').map(Number)
      fromDate = dateFromTzWallClock(y, m, d, 0, 0, 0, tz)
    } else {
      fromDate = dateFromTzWallClock(todayParts.year, todayParts.month, todayParts.day, 0, 0, 0, tz)
    }
    if (sp.to) {
      const [y, m, d] = sp.to.split('-').map(Number)
      // End of `to` day (exclusive end at next-day 00:00)
      toDate = addDays(dateFromTzWallClock(y, m, d, 0, 0, 0, tz), 1)
    } else {
      toDate = now
    }
    const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)))
    const labelFrom = sp.from ?? new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(fromDate)
    const labelTo = sp.to ?? new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now)
    return {
      key: 'custom',
      cutoffISO: fromDate.toISOString(),
      endCutoffISO: toDate.toISOString(),
      label: labelFrom === labelTo ? labelFrom : `${labelFrom} → ${labelTo}`,
      calendarAnchored: true,
      days,
    }
  }

  const key = (sp.range && RANGE_LABELS[sp.range as RangeKey]) ? (sp.range as RangeKey) : 'today'

  if (key === 'today') {
    const start = startOfDayInTz(now, tz)
    return {
      key,
      cutoffISO: start.toISOString(),
      endCutoffISO: now.toISOString(),
      label: 'Today',
      calendarAnchored: true,
      days: 1,
    }
  }
  if (key === 'yesterday') {
    const todayStart = startOfDayInTz(now, tz)
    const yStart = addDays(todayStart, -1)
    return {
      key,
      cutoffISO: yStart.toISOString(),
      endCutoffISO: todayStart.toISOString(),
      label: 'Yesterday',
      calendarAnchored: true,
      days: 1,
    }
  }
  if (key === 'wtd') {
    // Week starts Monday (ISO). Compute Monday in admin TZ.
    const todayStart = startOfDayInTz(now, tz)
    const dow = (() => {
      // 0 = Sunday, 1 = Monday … in admin TZ
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' })
      const w = fmt.format(now)
      return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[w] ?? 1
    })()
    const offset = dow === 0 ? -6 : -(dow - 1) // back to Monday
    const monday = addDays(todayStart, offset)
    return {
      key,
      cutoffISO: monday.toISOString(),
      endCutoffISO: now.toISOString(),
      label: 'Week to date',
      calendarAnchored: true,
      days: Math.max(1, Math.round((now.getTime() - monday.getTime()) / (24 * 60 * 60 * 1000))) || 1,
    }
  }
  if (key === 'mtd') {
    const { year, month } = partsInTz(now, tz)
    const monthStart = dateFromTzWallClock(year, month, 1, 0, 0, 0, tz)
    return {
      key,
      cutoffISO: monthStart.toISOString(),
      endCutoffISO: now.toISOString(),
      label: 'Month to date',
      calendarAnchored: true,
      days: Math.max(1, Math.round((now.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000))) || 1,
    }
  }

  // Rolling N×24h presets
  const hours = ROLLING_HOURS[key] ?? 24 * 7
  return {
    key,
    cutoffISO: new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString(),
    endCutoffISO: now.toISOString(),
    label: RANGE_LABELS[key],
    calendarAnchored: false,
    days: Math.round(hours / 24),
  }
}

/** Helper for callers that want just the day count for an SQL `interval N day`. */
export function rangeToDays(sel: RangeSelection): number {
  return sel.days
}
