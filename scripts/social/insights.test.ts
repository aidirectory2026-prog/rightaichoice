/**
 * Phase 13 Social — insights feedback-loop unit tests (pure model + scoring).
 * Run: npm run test:social-insights
 */

import { buildModel, engagementScore, expectedPerformance, expectedPerformanceByKind } from '../../lib/social/insights'

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

// ── engagementScore weighting ────────────────────────────────────────────────
{
  check('score: comments weigh more than likes', engagementScore({ comments: 1 }) > engagementScore({ likes: 1 }))
  check('score: shares weigh most', engagementScore({ shares: 1 }) > engagementScore({ comments: 1 }))
  check('score: impressions contribute a little', engagementScore({ impressions: 1000 }) === 5)
  check('score: empty = 0', engagementScore({}) === 0)
}

// ── buildModel + expectedPerformance ──────────────────────────────────────────
{
  const posts = [
    { id: 'p1', platform: 'x', kind: 'stat_card', posted_at: '2026-06-20T15:00:00Z' },
    { id: 'p2', platform: 'x', kind: 'stat_card', posted_at: '2026-06-21T15:00:00Z' },
    { id: 'p3', platform: 'x', kind: 'quote', posted_at: '2026-06-22T15:00:00Z' },
    { id: 'p4', platform: 'x', kind: 'quote', posted_at: '2026-06-23T15:00:00Z' },
  ]
  const metrics = [
    // stat cards perform well
    { post_id: 'p1', captured_at: '2026-06-20T18:00:00Z', impressions: 0, likes: 50, comments: 10, shares: 5, clicks: 0 },
    { post_id: 'p2', captured_at: '2026-06-21T18:00:00Z', impressions: 0, likes: 60, comments: 12, shares: 6, clicks: 0 },
    // quotes perform poorly
    { post_id: 'p3', captured_at: '2026-06-22T18:00:00Z', impressions: 0, likes: 2, comments: 0, shares: 0, clicks: 0 },
    { post_id: 'p4', captured_at: '2026-06-23T18:00:00Z', impressions: 0, likes: 3, comments: 0, shares: 0, clicks: 0 },
  ]
  const m = buildModel(posts, metrics)
  check('model: sampleSize counts posts with metrics', m.sampleSize === 4)
  check('model: stat_card avg > quote avg', m.byKind['stat_card'].avgScore > m.byKind['quote'].avgScore)
  check('eperf: high-performing stat_card → near 1', expectedPerformanceByKind(m, 'stat_card') === 1)
  check('eperf: low-performing quote → < stat_card', expectedPerformanceByKind(m, 'quote') < expectedPerformanceByKind(m, 'stat_card'))
  check('eperf: unseen kind (comparison) → neutral 0.5', expectedPerformanceByKind(m, 'comparison') === 0.5)
  check('eperf: platform×kind path works', expectedPerformance(m, 'x', 'stat_card') === 1)
}

// ── latest-metric-wins ─────────────────────────────────────────────────────────
{
  const posts = [{ id: 'p1', platform: 'x', kind: 'stat_card', posted_at: '2026-06-20T15:00:00Z' }]
  const metrics = [
    { post_id: 'p1', captured_at: '2026-06-20T18:00:00Z', impressions: 0, likes: 1, comments: 0, shares: 0, clicks: 0 },
    { post_id: 'p1', captured_at: '2026-06-21T18:00:00Z', impressions: 0, likes: 99, comments: 0, shares: 0, clicks: 0 },
  ]
  const m = buildModel(posts, metrics)
  check('model: uses LATEST snapshot per post', m.byKind['stat_card'].avgScore === 99)
}

// ── empty model = neutral ────────────────────────────────────────────────────
{
  const m = buildModel([], [])
  check('empty: maxAvg 0', m.maxAvg === 0)
  check('empty: expectedPerformance neutral 0.5', expectedPerformanceByKind(m, 'stat_card') === 0.5)
}

console.log(`\nsocial-insights: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
