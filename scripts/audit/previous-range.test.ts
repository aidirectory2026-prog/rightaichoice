/**
 * BUG-10 (Phase 13) regression test — previousRange() must be calendar-aware.
 *
 * The bug: previousRange always returned [start − span, start). For a PARTIAL
 * calendar window ("today" at 14:00 → a 14h window), that compared against
 * yesterday 10:00→24:00 (yesterday's EVENING) instead of yesterday 00:00→14:00
 * (yesterday's matching MORNING) — silently skewing every Today/WTD/MTD delta.
 *
 * Run: npm run test:range   (no network/db; pure date math, fixed TZ)
 */

process.env.NEXT_PUBLIC_ADMIN_TZ = 'Asia/Kolkata'

import { parseRange, previousRange } from '../../lib/admin/range'

let passed = 0
let failed = 0
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

// ── "today" (partial day) ──────────────────────────────────────────────
{
  const sel = parseRange({ range: 'today' })
  const prev = previousRange(sel)
  const selStart = new Date(sel.cutoffISO).getTime()
  const selEnd = new Date(sel.endCutoffISO).getTime()
  const prevStart = new Date(prev.cutoffISO).getTime()
  const prevEnd = new Date(prev.endCutoffISO).getTime()
  const elapsed = selEnd - selStart

  // prev window starts exactly one day before today's midnight…
  check('today: prevStart = today-start − 1 day', Math.abs(prevStart - (selStart - DAY)) < 1000,
    `prevStart off by ${(prevStart - (selStart - DAY)) / HOUR}h`)
  // …and ends at the SAME elapsed offset into yesterday (the morning hours).
  check('today: prevEnd = prevStart + elapsed (matching offset)', Math.abs(prevEnd - (prevStart + elapsed)) < 1000,
    `prevEnd off by ${(prevEnd - (prevStart + elapsed)) / HOUR}h`)
  // The OLD broken behaviour would have ended prev exactly at today's midnight.
  check('today: prevEnd is NOT today-midnight (old bug)', Math.abs(prevEnd - selStart) > HOUR,
    'prevEnd still lands on today-midnight → calendar shift not applied')
}

// ── "yesterday" (full day) ─────────────────────────────────────────────
{
  const sel = parseRange({ range: 'yesterday' })
  const prev = previousRange(sel)
  const selStart = new Date(sel.cutoffISO).getTime()
  const prevStart = new Date(prev.cutoffISO).getTime()
  const prevEnd = new Date(prev.endCutoffISO).getTime()
  check('yesterday: prev is the full day before (start −1d)', Math.abs(prevStart - (selStart - DAY)) < 1000)
  check('yesterday: prevEnd = yesterday-start', Math.abs(prevEnd - selStart) < 1000)
}

// ── rolling 7d (unchanged behaviour) ───────────────────────────────────
{
  const sel = parseRange({ range: '7d' })
  const prev = previousRange(sel)
  const selStart = new Date(sel.cutoffISO).getTime()
  const selEnd = new Date(sel.endCutoffISO).getTime()
  const prevStart = new Date(prev.cutoffISO).getTime()
  const prevEnd = new Date(prev.endCutoffISO).getTime()
  const span = selEnd - selStart
  check('7d rolling: prev = [start − span, start)', Math.abs(prevStart - (selStart - span)) < 1000 && Math.abs(prevEnd - selStart) < 1000)
  check('7d rolling: not calendarAnchored', sel.calendarAnchored === false)
}

// ── "mtd" (partial calendar month) ─────────────────────────────────────
{
  const sel = parseRange({ range: 'mtd' })
  const prev = previousRange(sel)
  const prevStart = new Date(prev.cutoffISO)
  const selStart = new Date(sel.cutoffISO)
  // prev month-start should be the 1st of the previous month (day-of-month 1 in IST).
  const istDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' }).format(prevStart)
  check('mtd: prevStart falls on the 1st (IST)', istDay === '1', `got day ${istDay}`)
  // and strictly before the current month's start.
  check('mtd: prevStart < selStart', prevStart.getTime() < selStart.getTime())
}

console.log(`\nprevious-range: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
