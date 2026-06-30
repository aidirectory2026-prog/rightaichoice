/**
 * Phase 13 — weekly strategy unit tests (pure helpers, no network/db).
 * Run: npm run test:social-strategy
 */

import { weekStartUTC, parseStrategy, strategyHint, SOCIAL_GOALS, type StoredStrategy } from '../../lib/social/strategy'

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

// ── weekStartUTC (Monday math) ────────────────────────────────────────────────
{
  // 2026-06-30 is a Tuesday → week start Monday 2026-06-29.
  check('weekStart: Tuesday → that Monday', weekStartUTC(new Date('2026-06-30T12:00:00Z')) === '2026-06-29')
  // Sunday belongs to the week that started the previous Monday.
  check('weekStart: Sunday → previous Monday', weekStartUTC(new Date('2026-07-05T23:00:00Z')) === '2026-06-29')
  // Monday maps to itself.
  check('weekStart: Monday → itself', weekStartUTC(new Date('2026-06-29T00:30:00Z')) === '2026-06-29')
  check('weekStart: returns YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(weekStartUTC(new Date('2026-06-30T00:00:00Z'))))
}

// ── parseStrategy ─────────────────────────────────────────────────────────────
{
  const good = parseStrategy('{"focus":"Build awareness","themes":["a","b"],"postTypes":["stat_card"],"cadence":"3/wk","rationale":"r","goalAlignment":"g"}')
  check('parse: valid JSON parses', !!good && good.focus === 'Build awareness')
  check('parse: themes/postTypes are arrays', !!good && good.themes.length === 2 && good.postTypes[0] === 'stat_card')
  check('parse: tolerates code fences', parseStrategy('```json\n{"focus":"X"}\n```')?.focus === 'X')
  check('parse: missing focus → null', parseStrategy('{"themes":["a"]}') === null)
  check('parse: non-JSON → null', parseStrategy('not json') === null)
  check('parse: drops non-string theme entries', (parseStrategy('{"focus":"f","themes":["ok",5,null,"two"]}')?.themes.length ?? 0) === 2)
}

// ── strategyHint (what feeds the brain) ───────────────────────────────────────
{
  const s: StoredStrategy = {
    focus: 'Establish presence',
    themes: ['trust', 'findings'],
    postTypes: ['stat_card'],
    cadence: '3/wk',
    rationale: 'r',
    goalAlignment: 'g',
    platform: 'x',
    weekStart: '2026-06-29',
    basedOn: { postCount: 0, avgEngagement: 0, topAngle: null, formatsUsed: [] },
  }
  const hint = strategyHint(s) ?? ''
  check('hint: includes focus', hint.includes('Establish presence'))
  check('hint: includes themes', hint.includes('trust') && hint.includes('findings'))
  check('hint: includes the goals', SOCIAL_GOALS.every((g) => hint.includes(g)))
  check('hint: null strategy → undefined', strategyHint(null) === undefined)
}

console.log(`\nsocial-strategy: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
