// Phase 13 Social Media Automation — the strict + smart SOP engine.
//
// These are the "conditions and features brained into every automation." Each rule
// is a PURE function (input → verdict) so it can be unit-tested and reused by both
// the brain (pre-draft gating) and the publishers (pre-post gating). Nothing here
// touches the DB or network — callers pass in the state (existing hashes, month
// spend, account stats) so the rules stay deterministic.

import crypto from 'node:crypto'
import type { DraftProposal, Platform, PostKind } from './types'

// ── Verdict shape ────────────────────────────────────────────────────────────
export type Verdict = { ok: boolean; reasons: string[] }
const PASS: Verdict = { ok: true, reasons: [] }
function fail(...reasons: string[]): Verdict {
  return { ok: false, reasons }
}

// ── Per-platform configuration (the "platform-fit rules") ─────────────────────
export type PlatformSOP = {
  maxChars: number
  maxHashtags: number
  requiresGraphic: boolean
  /** 'ok' = links fine; 'cost-gated' = allowed but accrues cost (X); 'bio' = no inline link (IG). */
  linkPolicy: 'ok' | 'cost-gated' | 'bio'
  maxPostsPerDay: number
  /** Minimum minutes between two posts on the same platform (no bursts). */
  minSpacingMinutes: number
  /** Local-time hours (24h) considered "good" windows for this platform. */
  optimalHoursUTC: number[]
}

export const PLATFORM_SOPS: Record<Platform, PlatformSOP> = {
  linkedin: {
    maxChars: 3000,
    maxHashtags: 3,
    requiresGraphic: false,
    linkPolicy: 'ok',
    maxPostsPerDay: 1,
    minSpacingMinutes: 240,
    optimalHoursUTC: [13, 14, 15, 16], // ~9am–12pm ET, weekday business hours
  },
  x: {
    maxChars: 280,
    maxHashtags: 2,
    requiresGraphic: false,
    linkPolicy: 'cost-gated',
    maxPostsPerDay: 3,
    minSpacingMinutes: 120,
    optimalHoursUTC: [13, 15, 17, 21],
  },
  instagram: {
    maxChars: 2200,
    maxHashtags: 12,
    requiresGraphic: true, // IG is image-mandatory
    linkPolicy: 'bio',
    maxPostsPerDay: 1,
    minSpacingMinutes: 360,
    optimalHoursUTC: [16, 17, 18, 22],
  },
  reddit: {
    maxChars: 40000,
    maxHashtags: 0, // hashtags read as spam on reddit
    requiresGraphic: false,
    linkPolicy: 'ok',
    maxPostsPerDay: 1,
    minSpacingMinutes: 720,
    optimalHoursUTC: [14, 15, 16, 17],
  },
}

// ── X budget governor ─────────────────────────────────────────────────────────
// X has no free tier (2026). Pay-per-use; we enforce a hard monthly cap.
export const X_COST_PER_POST = 0.015
export const X_COST_PER_POST_WITH_LINK = 0.2

export function xPostCost(hasLink: boolean): number {
  return hasLink ? X_COST_PER_POST_WITH_LINK : X_COST_PER_POST
}

/**
 * Can we afford this X post within the monthly cap? As the cap nears, link posts
 * (10× pricier) get blocked before plain posts — the brain should prefer no-link.
 */
export function withinXBudget(args: {
  monthSpendUSD: number
  monthlyCapUSD: number
  hasLink: boolean
}): Verdict {
  const cost = xPostCost(args.hasLink)
  if (args.monthSpendUSD + cost > args.monthlyCapUSD) {
    return fail(
      `X monthly cap reached: $${args.monthSpendUSD.toFixed(2)} + $${cost.toFixed(
        3,
      )} would exceed $${args.monthlyCapUSD.toFixed(2)}`,
    )
  }
  return PASS
}

// ── Reddit ban-avoidance (hard rules) ──────────────────────────────────────────
// Promo on Reddit is high-risk. Strict gate + always manual-approve.
export const REDDIT_DEFAULTS = {
  minAccountAgeDays: 30,
  minKarma: 50,
  maxPostsPerSubPerWeek: 1,
}

export function redditSafety(args: {
  subreddit: string
  allowlist: string[]
  accountAgeDays: number
  accountKarma: number
  /** Subs this same link has already been posted to (any time). */
  subsLinkAlreadyPosted: string[]
  /** Count of our posts to THIS sub in the trailing 7 days. */
  postsToSubLast7Days: number
  cfg?: Partial<typeof REDDIT_DEFAULTS>
}): Verdict {
  const cfg = { ...REDDIT_DEFAULTS, ...(args.cfg ?? {}) }
  const reasons: string[] = []
  const sub = args.subreddit?.replace(/^r\//, '').toLowerCase()

  if (!sub) reasons.push('no subreddit specified')
  else if (!args.allowlist.map((s) => s.replace(/^r\//, '').toLowerCase()).includes(sub))
    reasons.push(`subreddit r/${sub} not on allowlist`)

  if (args.accountAgeDays < cfg.minAccountAgeDays)
    reasons.push(`account age ${args.accountAgeDays}d < ${cfg.minAccountAgeDays}d minimum`)
  if (args.accountKarma < cfg.minKarma)
    reasons.push(`karma ${args.accountKarma} < ${cfg.minKarma} minimum`)

  // Never spray the same link across multiple subs.
  if (sub && args.subsLinkAlreadyPosted.map((s) => s.toLowerCase()).includes(sub) === false &&
      args.subsLinkAlreadyPosted.length > 0)
    reasons.push(
      `this link already posted to ${args.subsLinkAlreadyPosted.length} other sub(s) — never cross-post the same link`,
    )

  if (args.postsToSubLast7Days >= cfg.maxPostsPerSubPerWeek)
    reasons.push(
      `already posted to r/${sub} ${args.postsToSubLast7Days}× in last 7d (cap ${cfg.maxPostsPerSubPerWeek}/wk)`,
    )

  return reasons.length ? { ok: false, reasons } : PASS
}

// ── Brand-voice gate ────────────────────────────────────────────────────────────
// Mirrors the BANNED phrases in lib/copy/editorial-voice.ts (kept in sync). These
// are the #1 AI tells; any draft containing one is rejected pre-queue.
export const BANNED_PHRASES = [
  'gold standard', 'powerhouse', 'stands out', 'unique value proposition', 'game-changer',
  'game changer', 'seamless', 'robust', 'cutting-edge', 'bulletproof', 'unmatched',
  'best-in-class', 'no-brainer', 'second to none', "in today's landscape", 'in the world of',
  'look no further', 'when it comes to', 'the bottom line is', 'elevate your', 'unlock',
  'harness the power', 'ever-evolving', 'a testament to', 'boasts', 'navigating the',
]

export function voiceGate(copy: string): Verdict {
  const lower = ` ${copy.toLowerCase()} `
  const hits = BANNED_PHRASES.filter((p) => lower.includes(p.toLowerCase()))
  return hits.length ? fail(`banned voice phrase(s): ${hits.join(', ')}`) : PASS
}

// ── Variety / dedup ─────────────────────────────────────────────────────────────
/** Stable fingerprint of a post's angle, used to block repeats within N days. */
export function contentHash(parts: {
  platform: Platform
  kind: PostKind
  angle: string
}): string {
  const norm = parts.angle.toLowerCase().replace(/\s+/g, ' ').trim()
  return crypto.createHash('sha256').update(`${parts.platform}|${parts.kind}|${norm}`).digest('hex').slice(0, 16)
}

/** Pure dedup check: is this hash already among recent post hashes? */
export function isDuplicate(hash: string, recentHashes: string[]): Verdict {
  return recentHashes.includes(hash) ? fail('duplicate angle within variety window') : PASS
}

// ── Truth-only sourcing ─────────────────────────────────────────────────────────
/** Every draft must carry at least one real source URL; uncited drafts are rejected. */
export function sourcingGate(draft: Pick<DraftProposal, 'source_refs'>): Verdict {
  const refs = draft.source_refs ?? []
  const valid = refs.filter((r) => r?.url && /^https?:\/\//.test(r.url))
  return valid.length ? PASS : fail('no verifiable source URL — uncited drafts are not allowed')
}

// ── Platform-fit check ──────────────────────────────────────────────────────────
export function platformFit(draft: DraftProposal): Verdict {
  const sop = PLATFORM_SOPS[draft.platform]
  if (!sop) return fail(`unknown platform ${draft.platform}`)
  const reasons: string[] = []

  if (draft.copy.length > sop.maxChars)
    reasons.push(`copy ${draft.copy.length} chars > ${sop.maxChars} max for ${draft.platform}`)
  if ((draft.hashtags?.length ?? 0) > sop.maxHashtags)
    reasons.push(`${draft.hashtags.length} hashtags > ${sop.maxHashtags} max for ${draft.platform}`)
  if (sop.requiresGraphic && !draft.graphic_template)
    reasons.push(`${draft.platform} requires a graphic but none specified`)
  if (sop.linkPolicy === 'bio' && draft.link_url)
    reasons.push(`${draft.platform} does not support inline links (use link-in-bio)`)
  if (draft.platform === 'reddit' && (draft.hashtags?.length ?? 0) > 0)
    reasons.push('reddit posts should not use hashtags (reads as spam)')

  return reasons.length ? { ok: false, reasons } : PASS
}

// ── Scheduling intelligence ─────────────────────────────────────────────────────
/**
 * Can we publish on this platform at `whenUTC`, given today's post count and the
 * timestamp of the last post? Enforces daily cap + min spacing. Window preference
 * is a soft signal returned separately (the brain uses it; the gate doesn't block).
 */
export function canPublishNow(args: {
  platform: Platform
  whenUTCISO: string
  postsTodayOnPlatform: number
  lastPostUTCISO: string | null
}): Verdict {
  const sop = PLATFORM_SOPS[args.platform]
  const reasons: string[] = []
  const when = new Date(args.whenUTCISO).getTime()

  if (args.postsTodayOnPlatform >= sop.maxPostsPerDay)
    reasons.push(`${args.platform} daily cap ${sop.maxPostsPerDay} reached`)

  if (args.lastPostUTCISO) {
    const gapMin = (when - new Date(args.lastPostUTCISO).getTime()) / 60000
    if (gapMin < sop.minSpacingMinutes)
      reasons.push(
        `only ${Math.round(gapMin)}min since last ${args.platform} post (need ${sop.minSpacingMinutes}min)`,
      )
  }
  return reasons.length ? { ok: false, reasons } : PASS
}

export function isOptimalHour(platform: Platform, whenUTCISO: string): boolean {
  const h = new Date(whenUTCISO).getUTCHours()
  return PLATFORM_SOPS[platform].optimalHoursUTC.includes(h)
}

// ── Composite pre-queue gate (run by the brain before a draft enters the queue) ──
export function preQueueGate(
  draft: DraftProposal,
  ctx: { recentHashes: string[] },
): Verdict {
  const checks = [sourcingGate(draft), voiceGate(draft.copy), platformFit(draft), isDuplicate(draft.content_hash, ctx.recentHashes)]
  const reasons = checks.flatMap((c) => c.reasons)
  return reasons.length ? { ok: false, reasons } : PASS
}
