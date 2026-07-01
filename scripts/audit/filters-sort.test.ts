/**
 * Phase 14 — unit tests for the new sort helper + multi-value filter parsing.
 * Pure (no network/db). Run: npm run test:filters-sort
 */
process.env.NEXT_PUBLIC_ADMIN_TZ = 'Asia/Kolkata'

import { parseSort, sortRows, sortParams } from '../../lib/admin/sort'
import { parseAdminFilters, filtersToJsonb } from '../../lib/admin/filters'

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
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// ── parseSort ──────────────────────────────────────────────────────────────
const ALLOWED = ['name', 'views', 'rating'] as const
const FALLBACK = { key: 'views' as const, dir: 'desc' as const }

check('parseSort: valid key+dir', eq(parseSort({ sort: 'name', dir: 'asc' }, ALLOWED, FALLBACK), { key: 'name', dir: 'asc' }))
check('parseSort: unknown key → fallback', eq(parseSort({ sort: 'evil', dir: 'asc' }, ALLOWED, FALLBACK), FALLBACK))
check('parseSort: missing → fallback', eq(parseSort({}, ALLOWED, FALLBACK), FALLBACK))
check('parseSort: bad dir → fallback dir', eq(parseSort({ sort: 'rating', dir: 'sideways' }, ALLOWED, FALLBACK), { key: 'rating', dir: 'desc' }))
check('parseSort: scoped params', eq(parseSort({ tools_sort: 'name', tools_dir: 'asc' }, ALLOWED, FALLBACK, 'tools'), { key: 'name', dir: 'asc' }))
check('sortParams: default', eq(sortParams(), { sortKey: 'sort', dirKey: 'dir' }))
check('sortParams: scoped', eq(sortParams('tools'), { sortKey: 'tools_sort', dirKey: 'tools_dir' }))

// ── sortRows ─────────────────────────────────────────────────────────────────
const rows = [{ n: 3 }, { n: 1 }, { n: null }, { n: 2 }]
check('sortRows: numeric asc, nulls last', eq(sortRows(rows, 'n', 'asc').map((r) => r.n), [1, 2, 3, null]))
check('sortRows: numeric desc, nulls last', eq(sortRows(rows, 'n', 'desc').map((r) => r.n), [3, 2, 1, null]))
const words = [{ s: 'banana' }, { s: 'apple' }, { s: 'cherry' }]
check('sortRows: string asc', eq(sortRows(words, 's', 'asc').map((r) => r.s), ['apple', 'banana', 'cherry']))
check('sortRows: numeric-string compares numerically', eq(sortRows([{ v: '10' }, { v: '9' }], 'v', 'asc').map((r) => r.v), ['9', '10']))
check('sortRows: accessor', eq(sortRows([{ a: { b: 2 } }, { a: { b: 1 } }], 'x', 'asc', (r) => r.a.b).map((r) => r.a.b), [1, 2]))

// ── multi-value parseAdminFilters ────────────────────────────────────────────
const single = parseAdminFilters({ country: 'IN' })
check('parse: single country stays scalar', single.country === 'IN')
const multi = parseAdminFilters({ country: 'IN,US,SG' })
check('parse: multi country → array', eq(multi.country, ['IN', 'US', 'SG']))
const dedup = parseAdminFilters({ country: 'IN,IN,US' })
check('parse: dedupes', eq(dedup.country, ['IN', 'US']))
const dev = parseAdminFilters({ device: 'mobile,carrier-pigeon,tablet' })
check('parse: device drops invalid, keeps valid', eq(dev.device, ['mobile', 'tablet']))
const devOne = parseAdminFilters({ device: 'desktop' })
check('parse: single valid device stays scalar', devOne.device === 'desktop')
const evt = parseAdminFilters({ event: 'Page_Viewed' })
check('parse: event sanitized (lowercase)', evt.event === 'page_viewed')

// ── filtersToJsonb ────────────────────────────────────────────────────────────
check('jsonb: scalar country', eq(filtersToJsonb(single), { country: 'IN' }))
check('jsonb: array country', eq(filtersToJsonb(multi), { country: ['IN', 'US', 'SG'] }))
check('jsonb: empty → null', filtersToJsonb(parseAdminFilters({})) === null)
check('jsonb: dropEvent drops event only', eq(
  filtersToJsonb(parseAdminFilters({ country: 'IN', event: 'page_viewed' }), { dropEvent: true }),
  { country: 'IN' },
))
check('jsonb: distinct_ids emitted', eq(
  filtersToJsonb({ ...parseAdminFilters({}), distinctIds: ['a', 'b'] }),
  { distinct_ids: ['a', 'b'] },
))

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
