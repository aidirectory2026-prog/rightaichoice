// Phase 8.d.6 — shared date-range helpers for admin pages.
// One URL convention: ?range=today|7d|30d   OR   ?from=YYYY-MM-DD&to=YYYY-MM-DD

export type RangeKey = 'today' | '7d' | '30d' | 'custom'

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today (24h)',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  custom: 'Custom',
}

const RANGE_HOURS: Record<Exclude<RangeKey, 'custom'>, number> = {
  today: 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
}

export type RangeSelection = {
  key: RangeKey
  cutoffISO: string         // start of window (>= this)
  endCutoffISO: string      // end of window (< this); ISO of "now" for non-custom
  label: string
}

export function parseRange(sp: { range?: string; from?: string; to?: string }): RangeSelection {
  const hasCustom = sp.from || sp.to
  if (hasCustom) {
    const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 24 * 60 * 60 * 1000)
    const to = sp.to ? new Date(sp.to + 'T23:59:59.999Z') : new Date()
    const fromLabel = from.toISOString().slice(0, 10)
    const toLabel = to.toISOString().slice(0, 10)
    return {
      key: 'custom',
      cutoffISO: from.toISOString(),
      endCutoffISO: to.toISOString(),
      label: fromLabel === toLabel ? fromLabel : `${fromLabel} → ${toLabel}`,
    }
  }
  const key: RangeKey = sp.range === '7d' || sp.range === '30d' ? sp.range : 'today'
  const hours = RANGE_HOURS[key as Exclude<RangeKey, 'custom'>]
  return {
    key,
    cutoffISO: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
    endCutoffISO: new Date().toISOString(),
    label: RANGE_LABELS[key],
  }
}
