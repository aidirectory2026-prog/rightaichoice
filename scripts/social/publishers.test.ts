/**
 * Phase 13 Social — publisher unit tests (pure payload builders + gates, no network).
 * Run: npm run test:social-publishers
 */

import { buildTweetPayload, xPublisher } from '../../lib/social/publishers/x'
import { buildRedditSubmit, redditPublisher } from '../../lib/social/publishers/reddit'
import { buildLinkedInPost, linkedinPublisher } from '../../lib/social/publishers/linkedin'
import { buildIgContainer, instagramPublisher } from '../../lib/social/publishers/instagram'
import { isRetryableStatus, clamp, tokenUsable } from '../../lib/social/publishers/util'
import { selectExpiring } from '../../lib/social/publishers/refresh'
import type { SocialAccount, SocialPost } from '../../lib/social/types'

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

function post(p: Partial<SocialPost>): SocialPost {
  return {
    id: 'id1',
    platform: 'x',
    kind: 'text',
    status: 'approved',
    copy: 'hello world',
    hashtags: [],
    link_url: null,
    graphic_template: null,
    graphic_data: {},
    graphic_size: null,
    subreddit: null,
    source_refs: [],
    content_hash: 'h',
    brain_meta: {},
    scheduled_at: null,
    posted_at: null,
    external_post_id: null,
    external_url: null,
    cost_usd: 0,
    error: null,
    created_at: '',
    updated_at: '',
    ...p,
  }
}
const noAccount: SocialAccount | null = null
function connected(over: Partial<SocialAccount> = {}): SocialAccount {
  return {
    id: 'a',
    platform: 'x',
    display_name: null,
    access_token: 'tok',
    refresh_token: null,
    token_expires_at: null,
    scope: null,
    external_account_id: null,
    status: 'connected',
    meta: {},
    ...over,
  }
}

// ── util ────────────────────────────────────────────────────────────────────
{
  check('util: 429 retryable', isRetryableStatus(429))
  check('util: 503 retryable', isRetryableStatus(503))
  check('util: 401 NOT retryable', !isRetryableStatus(401))
  check('util: 400 NOT retryable', !isRetryableStatus(400))
  check('util: clamp leaves short text', clamp('hi', 280) === 'hi')
  check('util: clamp truncates + ellipsis', clamp('a'.repeat(300), 280).length === 280)
  check('util: tokenUsable false when no token', !tokenUsable(null, null))
  check('util: tokenUsable true when no expiry', tokenUsable('t', null))
  check('util: tokenUsable false when expired', !tokenUsable('t', new Date(Date.now() - 1000).toISOString()))
}

// ── X ─────────────────────────────────────────────────────────────────────────
{
  check('x: payload is {text}', buildTweetPayload(post({ copy: 'hi' })).text === 'hi')
  check('x: payload clamps to 280', buildTweetPayload(post({ copy: 'a'.repeat(400) })).text.length === 280)
  check('x: disabled without flag', !xPublisher.isEnabled(connected()))
  process.env.X_ENABLED = '1'
  check('x: enabled with flag + connected token', xPublisher.isEnabled(connected()))
  check('x: disabled when no account', !xPublisher.isEnabled(noAccount))
  check('x: disabled when token expired', !xPublisher.isEnabled(connected({ token_expires_at: new Date(Date.now() - 1000).toISOString() })))
  delete process.env.X_ENABLED
}

// ── Reddit ──────────────────────────────────────────────────────────────────
{
  const self = buildRedditSubmit(post({ platform: 'reddit', subreddit: 'r/SaaS', copy: 'First line\nbody', brain_meta: {} }))
  check('reddit: strips r/ from sr', self.sr === 'SaaS')
  check('reddit: self-post kind when no link', self.kind === 'self' && self.text === 'First line\nbody')
  check('reddit: title falls back to first line', self.title === 'First line')
  const link = buildRedditSubmit(post({ platform: 'reddit', subreddit: 'SaaS', link_url: 'https://x.com', brain_meta: { title: 'Cool data' } }))
  check('reddit: link-post kind when link present', link.kind === 'link' && link.url === 'https://x.com')
  check('reddit: title uses brain_meta.title', link.title === 'Cool data')
  check('reddit: disabled without flag', !redditPublisher.isEnabled(connected({ platform: 'reddit' })))
}

// ── LinkedIn ────────────────────────────────────────────────────────────────
{
  const body = buildLinkedInPost(post({ platform: 'linkedin', copy: 'Insight here', hashtags: ['#AI', '#Tools'] }), 'urn:li:organization:123')
  check('linkedin: author = org urn', body.author === 'urn:li:organization:123')
  check('linkedin: commentary has copy + hashtags', body.commentary.includes('Insight here') && body.commentary.includes('#AI #Tools'))
  check('linkedin: published + public', body.lifecycleState === 'PUBLISHED' && body.visibility === 'PUBLIC')
  check('linkedin: disabled without org urn', !linkedinPublisher.isEnabled(connected({ platform: 'linkedin' })))
}

// ── Instagram ─────────────────────────────────────────────────────────────────
{
  const c = buildIgContainer(post({ platform: 'instagram', copy: 'caption', hashtags: ['#a'] }), 'https://site/img.png')
  check('ig: image_url set', c.image_url === 'https://site/img.png')
  check('ig: caption = copy + hashtags', c.caption.includes('caption') && c.caption.includes('#a'))
  check('ig: disabled without flag/user-id', !instagramPublisher.isEnabled(connected({ platform: 'instagram' })))
}

// ── token refresh selector ──────────────────────────────────────────────────
{
  const now = Date.now()
  const mk = (over: Partial<SocialAccount>) => connected(over)
  const accts = [
    mk({ token_expires_at: new Date(now + 1 * 3600_000).toISOString() }), // expiring in 1h
    mk({ token_expires_at: new Date(now + 200 * 3600_000).toISOString() }), // far future
    mk({ token_expires_at: null }), // no expiry
    mk({ status: 'disconnected', token_expires_at: new Date(now + 1000).toISOString() }), // not connected
  ]
  const exp = selectExpiring(accts, 72, now)
  check('refresh: selects only the soon-expiring connected token', exp.length === 1)
  check('refresh: ignores far-future + null-expiry + disconnected', exp.length === 1)
}

console.log(`\nsocial-publishers: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
