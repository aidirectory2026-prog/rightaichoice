/**
 * Phase 13 Social — SOP engine unit tests (pure rules, no network/db).
 *
 * Verifies the "strict + smart SOPs": X budget governor, Reddit ban-avoidance,
 * brand-voice gate, variety/dedup, truth-only sourcing, platform-fit, scheduling.
 *
 * Run: npm run test:social-sops
 */

import {
  withinXBudget,
  xPostCost,
  redditSafety,
  voiceGate,
  contentHash,
  isDuplicate,
  sourcingGate,
  platformFit,
  canPublishNow,
  isOptimalHour,
  preQueueGate,
  PLATFORM_SOPS,
} from '../../lib/social/sops'
import type { DraftProposal } from '../../lib/social/types'

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

// ── X budget governor ──────────────────────────────────────────────────────
{
  check('X plain-post cost is $0.015', xPostCost(false) === 0.015)
  check('X link-post cost is $0.20', xPostCost(true) === 0.2)
  check(
    'budget: plain post allowed under cap',
    withinXBudget({ monthSpendUSD: 4.0, monthlyCapUSD: 5, hasLink: false }).ok,
  )
  check(
    'budget: link post (10×) blocked when it would exceed cap',
    !withinXBudget({ monthSpendUSD: 4.9, monthlyCapUSD: 5, hasLink: true }).ok,
  )
  check(
    'budget: plain post still allowed at same spend (link is the pricier lever)',
    withinXBudget({ monthSpendUSD: 4.9, monthlyCapUSD: 5, hasLink: false }).ok,
  )
  check(
    'budget: exact-cap post is allowed (<=, not <)',
    withinXBudget({ monthSpendUSD: 4.985, monthlyCapUSD: 5, hasLink: false }).ok,
  )
}

// ── Reddit ban-avoidance ─────────────────────────────────────────────────────
{
  const base = {
    subreddit: 'artificial',
    allowlist: ['artificial', 'r/MachineLearning'],
    accountAgeDays: 120,
    accountKarma: 500,
    subsLinkAlreadyPosted: [] as string[],
    postsToSubLast7Days: 0,
  }
  check('reddit: clean post on allowlisted sub passes', redditSafety(base).ok)
  check('reddit: allowlist tolerates r/ prefix + case', redditSafety({ ...base, subreddit: 'machinelearning' }).ok)
  check('reddit: off-allowlist sub blocked', !redditSafety({ ...base, subreddit: 'pics' }).ok)
  check('reddit: young account blocked', !redditSafety({ ...base, accountAgeDays: 5 }).ok)
  check('reddit: low-karma account blocked', !redditSafety({ ...base, accountKarma: 10 }).ok)
  check(
    'reddit: same link already on another sub blocked (no cross-posting)',
    !redditSafety({ ...base, subsLinkAlreadyPosted: ['MachineLearning'] }).ok,
  )
  check(
    'reddit: weekly per-sub cap blocks a 2nd post',
    !redditSafety({ ...base, postsToSubLast7Days: 1 }).ok,
  )
}

// ── Brand-voice gate ─────────────────────────────────────────────────────────
{
  check('voice: clean copy passes', voiceGate('We compared 40 AI writing tools on price and output quality.').ok)
  check('voice: "game-changer" rejected', !voiceGate('This tool is a real game-changer.').ok)
  check('voice: "seamless" rejected (case-insensitive)', !voiceGate('A Seamless workflow.').ok)
  check('voice: "unlock" rejected', !voiceGate('Unlock your productivity today.').ok)
}

// ── Variety / dedup ──────────────────────────────────────────────────────────
{
  const h1 = contentHash({ platform: 'x', kind: 'stat_card', angle: 'Top 5 free AI image tools' })
  const h2 = contentHash({ platform: 'x', kind: 'stat_card', angle: 'top 5 free   AI image tools' }) // normalised same
  const h3 = contentHash({ platform: 'x', kind: 'stat_card', angle: 'Best AI coding assistants' })
  check('dedup: hash is stable + whitespace/case-insensitive', h1 === h2)
  check('dedup: different angle → different hash', h1 !== h3)
  check('dedup: repeat angle flagged', !isDuplicate(h1, [h1, h3]).ok)
  check('dedup: fresh angle allowed', isDuplicate(h3, ['someotherhash']).ok)
}

// ── Truth-only sourcing ───────────────────────────────────────────────────────
{
  check('sourcing: cited draft passes', sourcingGate({ source_refs: [{ title: 'X', url: 'https://x.com/a' }] }).ok)
  check('sourcing: uncited draft rejected', !sourcingGate({ source_refs: [] }).ok)
  check('sourcing: non-URL ref rejected', !sourcingGate({ source_refs: [{ title: 'X', url: 'not-a-url' }] }).ok)
}

// ── Platform-fit ──────────────────────────────────────────────────────────────
function draft(p: Partial<DraftProposal>): DraftProposal {
  return {
    platform: 'x',
    kind: 'text',
    copy: 'short copy',
    hashtags: [],
    source_refs: [{ title: 'src', url: 'https://example.com' }],
    content_hash: 'abc',
    brain_meta: {},
    ...p,
  }
}
{
  check('fit: X copy over 280 chars rejected', !platformFit(draft({ platform: 'x', copy: 'a'.repeat(281) })).ok)
  check('fit: X copy at 280 allowed', platformFit(draft({ platform: 'x', copy: 'a'.repeat(280) })).ok)
  check(
    'fit: LinkedIn >3 hashtags rejected',
    !platformFit(draft({ platform: 'linkedin', hashtags: ['#a', '#b', '#c', '#d'] })).ok,
  )
  check(
    'fit: Instagram requires a graphic',
    !platformFit(draft({ platform: 'instagram', copy: 'caption', graphic_template: undefined })).ok,
  )
  check(
    'fit: Instagram link allowed (posted as first comment, not inline)',
    platformFit(
      draft({ platform: 'instagram', graphic_template: 'stat_card', link_url: 'https://x.com' }),
    ).ok,
  )
  check('fit: reddit hashtags rejected', !platformFit(draft({ platform: 'reddit', hashtags: ['#ai'] })).ok)
  // X t.co-aware length: a long UTM link must not false-trip 280.
  check(
    'fit: X copy with long UTM link passes (t.co counts as 23)',
    platformFit(draft({ platform: 'x', copy: 'short hook https://rightaichoice.com/state-of-ai-tools?utm_source=x&utm_medium=social&utm_campaign=rac_social' })).ok,
  )
}

// ── Scheduling intelligence ─────────────────────────────────────────────────────
{
  check(
    'schedule: under daily cap + enough spacing → ok',
    canPublishNow({
      platform: 'x',
      whenUTCISO: '2026-06-30T15:00:00Z',
      postsTodayOnPlatform: 1,
      lastPostUTCISO: '2026-06-30T12:00:00Z',
    }).ok,
  )
  check(
    'schedule: daily cap reached → blocked',
    !canPublishNow({
      platform: 'x',
      whenUTCISO: '2026-06-30T15:00:00Z',
      postsTodayOnPlatform: 3,
      lastPostUTCISO: null,
    }).ok,
  )
  check(
    'schedule: too soon after last post → blocked (no bursts)',
    !canPublishNow({
      platform: 'x',
      whenUTCISO: '2026-06-30T12:30:00Z',
      postsTodayOnPlatform: 1,
      lastPostUTCISO: '2026-06-30T12:00:00Z',
    }).ok,
  )
  check('schedule: 15:00Z is an optimal X hour', isOptimalHour('x', '2026-06-30T15:00:00Z'))
  check('schedule: 04:00Z is NOT an optimal X hour', !isOptimalHour('x', '2026-06-30T04:00:00Z'))
}

// ── Composite pre-queue gate ─────────────────────────────────────────────────────
{
  const good = draft({
    platform: 'linkedin',
    copy: 'We benchmarked 40 AI tools on real tasks. Three findings surprised us.',
    hashtags: ['#AI'],
    content_hash: 'fresh1',
  })
  check('pre-queue: clean cited on-voice draft passes', preQueueGate(good, { recentHashes: [] }).ok)
  check(
    'pre-queue: duplicate angle blocked',
    !preQueueGate(good, { recentHashes: ['fresh1'] }).ok,
  )
  check(
    'pre-queue: banned-phrase draft blocked',
    !preQueueGate(draft({ copy: 'a seamless game-changer', content_hash: 'z' }), { recentHashes: [] }).ok,
  )
}

// ── Config sanity ─────────────────────────────────────────────────────────────
{
  check('config: all 4 platforms configured', Object.keys(PLATFORM_SOPS).length === 4)
  check('config: X is cost-gated for links', PLATFORM_SOPS.x.linkPolicy === 'cost-gated')
  check('config: IG requires a graphic', PLATFORM_SOPS.instagram.requiresGraphic === true)
}

console.log(`\nsocial-sops: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
