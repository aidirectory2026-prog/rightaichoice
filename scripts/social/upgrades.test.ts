/**
 * Phase 13 R2 — smart-upgrade unit tests (UTM, X length, link dedup, best-time
 * scheduling, evergreen recycle ranking). Pure functions, no network/db.
 * Run: npm run test:social-upgrades
 */

import { withUtm, canonicalLink, xEffectiveLength } from '../../lib/social/util'
import { isDuplicateLink, linkDedupKey } from '../../lib/social/sops'
import { nextSlot, rankRecyclable } from '../../lib/social/brain'
import type { PerformanceModel } from '../../lib/social/insights'
import type { Platform } from '../../lib/social/types'

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

// ── UTM ─────────────────────────────────────────────────────────────────────
{
  const u = withUtm('https://rightaichoice.com/tools/x', 'linkedin')
  check('utm: adds source/medium/campaign', u.includes('utm_source=linkedin') && u.includes('utm_medium=social') && u.includes('utm_campaign=rac_social'))
  check('utm: preserves existing query', withUtm('https://x.com/a?b=1', 'x').includes('b=1'))
  check('utm: leaves invalid url untouched', withUtm('not-a-url', 'x') === 'not-a-url')
}

// ── canonicalLink (dedup key source) ─────────────────────────────────────────
{
  check('canon: strips utm params', canonicalLink('https://r.com/p?utm_source=x&k=1') === 'https://r.com/p?k=1')
  check('canon: strips trailing slash + hash', canonicalLink('https://r.com/p/#frag') === 'https://r.com/p')
  check('canon: utm-only variants collapse to same', canonicalLink('https://r.com/p?utm_source=x') === canonicalLink('https://r.com/p?utm_source=linkedin'))
}

// ── X effective length (t.co) ─────────────────────────────────────────────────
{
  const longUrl = 'https://rightaichoice.com/state-of-ai-tools?utm_source=x&utm_medium=social&utm_campaign=rac_social'
  check('xlen: long URL counts as 23', xEffectiveLength(longUrl) === 23)
  check('xlen: text + url = text + 23', xEffectiveLength(`hello ${longUrl}`) === 'hello '.length + 23)
  check('xlen: plain text unchanged', xEffectiveLength('just text') === 'just text'.length)
}

// ── Link dedup (global, cross-platform) ───────────────────────────────────────
{
  const url = 'https://rightaichoice.com/tools/claude'
  const keyX = linkDedupKey('x', withUtm(url, 'x'))
  check('dedup-key: utm-independent', keyX === linkDedupKey('x', withUtm(url, 'x', 'other')))
  check('dedup: same link same platform → blocked', !isDuplicateLink('x', withUtm(url, 'x'), [keyX]).ok)
  check('dedup: same link DIFFERENT platform → allowed', isDuplicateLink('linkedin', withUtm(url, 'linkedin'), [keyX]).ok)
  check('dedup: no link → pass', isDuplicateLink('x', null, [keyX]).ok)
}

// ── Best-time scheduling ──────────────────────────────────────────────────────
{
  const hourOf = (iso: string) => new Date(iso).getUTCHours()
  // X optimal hours are [13,15,17,21]; make 21 the historically best.
  const perf: PerformanceModel = {
    byPlatformKind: {},
    byPlatform: {},
    byKind: {},
    byHourUTC: { 21: { n: 5, avgScore: 100 }, 13: { n: 5, avgScore: 1 } } as unknown as Record<number, { n: number; avgScore: number }>,
    maxAvg: 100,
    sampleSize: 10,
  }
  check('slot: with data, first post uses best-performing hour (21)', hourOf(nextSlot('x', 0, perf)) === 21)
  check('slot: without data, first post uses static first hour (13)', hourOf(nextSlot('x', 0)) === 13)
  check('slot: scheduled in the future', new Date(nextSlot('x', 0)).getTime() > Date.now())
}

// ── Evergreen recycle ranking ─────────────────────────────────────────────────
{
  const now = Date.parse('2026-06-30T00:00:00Z')
  const old1 = '2026-05-01T00:00:00Z' // >30d old
  const old2 = '2026-05-02T00:00:00Z'
  const recent = '2026-06-29T00:00:00Z' // too new
  const posts = [
    { id: 'a', platform: 'x' as Platform, copy: 'a', posted_at: old1 },
    { id: 'b', platform: 'x' as Platform, copy: 'b', posted_at: old2 },
    { id: 'c', platform: 'x' as Platform, copy: 'c', posted_at: recent },
  ]
  const metrics = new Map([
    ['a', { likes: 5 }],
    ['b', { likes: 50 }],
    ['c', { likes: 999 }],
  ])
  const ranked = rankRecyclable(posts, metrics, 30, now)
  check('recycle: excludes too-recent posts', !ranked.find((r) => r.id === 'c'))
  check('recycle: ranks higher engagement first', ranked[0]?.id === 'b' && ranked[1]?.id === 'a')
  check('recycle: drops zero-engagement', rankRecyclable([{ id: 'z', platform: 'x', copy: 'z', posted_at: old1 }], new Map(), 30, now).length === 0)
}

console.log(`\nsocial-upgrades: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
