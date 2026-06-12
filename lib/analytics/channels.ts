/**
 * Phase 10.7a (2026-06-12) — channel classifier (the referrer ask).
 *
 * ONE pure function that maps (referrer host, utm_medium, utm_source,
 * ad click-ids) → a marketing channel taxonomy. Used in three places that
 * must agree:
 *   1. lib/analytics.ts mirrorContext() — stamps properties.channel +
 *      properties.channel_source on every mirrored event at capture time.
 *   2. /admin user 360 + Users directory — derive a first-touch channel
 *      chip from user_intent_profile first_touch_* columns.
 *   3. The synthetic suite's channel probes — assert the classification
 *      a real browser navigation produces.
 *
 * Pure + table-driven so it is unit-testable and the host map can grow as
 * unknown hosts surface (plan §7a: unknown hosts land in 'referral' and are
 * visible in the admin Sources panel for review).
 *
 * Precedence (first match wins):
 *   click-ids (gclid/fbclid/msclkid/ttclid) → paid
 *   utm_medium = email                       → email
 *   utm_medium cpc/ppc/paid-ish/display       → paid
 *   internal hosts (our own domains)         → internal
 *   host map (search/ai/social/community/email)
 *   any other host                           → referral
 *   no referrer at all                       → direct
 *
 * Validated 2026-06-12 against ALL 18 distinct referrer hosts in the live
 * 90-day user_events window (plan calls for 100 hand-labeled referrers;
 * the live catalog has 18 distinct hosts — all hand-labeled, table in the
 * 10.7a.1 commit message + docs/admin/phase7a-gate.md).
 */

export type Channel =
  | 'search'
  | 'ai'
  | 'social'
  | 'community'
  | 'email'
  | 'paid'
  | 'referral'
  | 'direct'
  | 'internal'

export type ClickIds = {
  gclid?: string | null
  fbclid?: string | null
  msclkid?: string | null
  ttclid?: string | null
}

export type ChannelResult = { channel: Channel; source: string }

/** One host-map rule. `host` matches the normalized referrer host exactly
 *  OR as a dot-suffix (`google.com` matches `news.google.com`). Order
 *  matters: specific subdomains (gemini.google.com, mail.google.com) sit
 *  ABOVE their generic parents (google.com → search). */
export type HostRule = { host: string; channel: Channel; source: string }

/**
 * The exported host map (plan §7a: "the map keeps growing" — add rules
 * here as unknown hosts surface in the Sources panel). EVERY rule is
 * matched in order against the normalized host (lowercased, port and
 * leading `www.` stripped).
 */
export const CHANNEL_HOST_MAP: readonly HostRule[] = [
  // ── AI assistants (must precede generic google.com → search) ──────
  { host: 'chatgpt.com', channel: 'ai', source: 'chatgpt' },
  { host: 'chat.openai.com', channel: 'ai', source: 'chatgpt' },
  { host: 'perplexity.ai', channel: 'ai', source: 'perplexity' },
  { host: 'claude.ai', channel: 'ai', source: 'claude' },
  { host: 'gemini.google.com', channel: 'ai', source: 'gemini' },
  { host: 'notebooklm.google.com', channel: 'ai', source: 'notebooklm' },
  { host: 'copilot.microsoft.com', channel: 'ai', source: 'copilot' },
  { host: 'you.com', channel: 'ai', source: 'you.com' },
  { host: 'poe.com', channel: 'ai', source: 'poe' },

  // ── Email clients (also before generic google) ─────────────────────
  { host: 'mail.google.com', channel: 'email', source: 'gmail' },
  { host: 'com.google.android.gm', channel: 'email', source: 'gmail' }, // android-app:// Gmail
  { host: 'outlook.live.com', channel: 'email', source: 'outlook' },
  { host: 'outlook.office.com', channel: 'email', source: 'outlook' },
  { host: 'outlook.office365.com', channel: 'email', source: 'outlook' },
  { host: 'mail.yahoo.com', channel: 'email', source: 'yahoo_mail' },
  { host: 'mail.proton.me', channel: 'email', source: 'protonmail' },
  { host: 'mail.zoho.com', channel: 'email', source: 'zoho_mail' },

  // ── Google product surfaces that are NOT search (before google.com) ─
  // analytics.google.com observed live 2026-06: the owner clicking through
  // from the GA dashboard — a tool referral, not a search acquisition.
  { host: 'analytics.google.com', channel: 'referral', source: 'analytics.google.com' },
  { host: 'docs.google.com', channel: 'referral', source: 'docs.google.com' },
  { host: 'drive.google.com', channel: 'referral', source: 'drive.google.com' },
  { host: 'sites.google.com', channel: 'referral', source: 'sites.google.com' },
  { host: 'groups.google.com', channel: 'community', source: 'google_groups' },

  // ── Search engines ─────────────────────────────────────────────────
  { host: 'google.com', channel: 'search', source: 'google' },
  // android-app:// referrer of the Google Search app — hostname parses to
  // the package name.
  { host: 'com.google.android.googlequicksearchbox', channel: 'search', source: 'google' },
  { host: 'bing.com', channel: 'search', source: 'bing' },
  { host: 'duckduckgo.com', channel: 'search', source: 'duckduckgo' },
  { host: 'yandex.ru', channel: 'search', source: 'yandex' },
  { host: 'yandex.com', channel: 'search', source: 'yandex' },
  { host: 'baidu.com', channel: 'search', source: 'baidu' },
  { host: 'ecosia.org', channel: 'search', source: 'ecosia' },
  { host: 'search.brave.com', channel: 'search', source: 'brave' },
  { host: 'search.yahoo.com', channel: 'search', source: 'yahoo' },

  // ── Social ─────────────────────────────────────────────────────────
  { host: 'linkedin.com', channel: 'social', source: 'linkedin' },
  { host: 'lnkd.in', channel: 'social', source: 'linkedin' },
  { host: 'x.com', channel: 'social', source: 'x' },
  { host: 'twitter.com', channel: 'social', source: 'x' },
  { host: 't.co', channel: 'social', source: 'x' },
  { host: 'facebook.com', channel: 'social', source: 'facebook' },
  { host: 'fb.me', channel: 'social', source: 'facebook' },
  { host: 'instagram.com', channel: 'social', source: 'instagram' },
  { host: 'youtube.com', channel: 'social', source: 'youtube' },
  { host: 'youtu.be', channel: 'social', source: 'youtube' },
  { host: 'tiktok.com', channel: 'social', source: 'tiktok' },
  { host: 'threads.net', channel: 'social', source: 'threads' },
  { host: 'bsky.app', channel: 'social', source: 'bluesky' },
  { host: 'bilibili.com', channel: 'social', source: 'bilibili' }, // observed live 2026-06

  // ── Community / forums (reddit deliberately NOT social — plan §7a) ──
  { host: 'reddit.com', channel: 'community', source: 'reddit' },
  { host: 'news.ycombinator.com', channel: 'community', source: 'hacker_news' },
  { host: 'producthunt.com', channel: 'community', source: 'product_hunt' },
  { host: 'indiehackers.com', channel: 'community', source: 'indie_hackers' },
  { host: 'quora.com', channel: 'community', source: 'quora' },
  { host: 'stackoverflow.com', channel: 'community', source: 'stack_overflow' },
  { host: 'stackexchange.com', channel: 'community', source: 'stack_exchange' },
  { host: 'dev.to', channel: 'community', source: 'dev.to' },
  { host: 'discord.com', channel: 'community', source: 'discord' },
  { host: 'discord.gg', channel: 'community', source: 'discord' },
]

/** Internal = our own surfaces + auth bounces: NOT acquisition traffic. */
export const INTERNAL_HOSTS: readonly string[] = [
  'rightaichoice.com',
  'localhost',
  '127.0.0.1',
  // OAuth round-trip lands back with the provider as referrer — that is a
  // bounce through accounts.google.com, not a Google acquisition.
  'accounts.google.com',
]

const PAID_MEDIUM_RE = /^(cpc|ppc|cpm|cpv|cpa|paid|paid[-_].*|display|retargeting|banner)$/

/** Lowercase, strip port + leading `www.`. Accepts a bare host or anything
 *  URL-ish; never throws. */
export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null
  let h = host.trim().toLowerCase()
  if (!h) return null
  // Tolerate full URLs being passed where a host was expected.
  if (h.includes('://')) {
    try {
      h = new URL(h).hostname.toLowerCase()
    } catch {
      return null
    }
  }
  h = h.replace(/:\d+$/, '').replace(/^www\./, '')
  return h || null
}

/** Extract the normalized host from a full referrer URL (or null). */
export function hostFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer || referrer === 'direct') return null
  try {
    return normalizeHost(new URL(referrer).hostname)
  } catch {
    // Bare-host values ('google.com') tolerated; anything else → null.
    return /^[a-z0-9.:-]+$/i.test(referrer.trim()) ? normalizeHost(referrer) : null
  }
}

function hostMatches(host: string, rule: string): boolean {
  return host === rule || host.endsWith(`.${rule}`)
}

function isInternalHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1') return true
  if (INTERNAL_HOSTS.some((h) => hostMatches(host, h))) return true
  // Vercel preview deployments of our own app.
  if (host.endsWith('.vercel.app')) return true
  return false
}

/**
 * Classify one touch. `referrerHost` may be a bare host OR a full URL —
 * both are normalized. Returns the channel plus a human-readable source
 * ('google', 'chatgpt', the raw host for referral, '(direct)' for direct).
 */
export function classifyChannel(
  referrerHost: string | null,
  utmMedium?: string | null,
  utmSource?: string | null,
  clickIds?: ClickIds,
): ChannelResult {
  const host = normalizeHost(referrerHost)

  // 1. Ad click-ids beat everything — the click came from a paid placement
  //    even when the referrer looks organic (e.g. google.com with a gclid).
  if (clickIds) {
    if (clickIds.gclid) return { channel: 'paid', source: 'google_ads' }
    if (clickIds.fbclid) return { channel: 'paid', source: 'meta_ads' }
    if (clickIds.msclkid) return { channel: 'paid', source: 'microsoft_ads' }
    if (clickIds.ttclid) return { channel: 'paid', source: 'tiktok_ads' }
  }

  // 2. Explicit campaign medium.
  const medium = (utmMedium ?? '').trim().toLowerCase()
  const source = (utmSource ?? '').trim().toLowerCase()
  if (medium === 'email' || medium === 'newsletter') {
    return { channel: 'email', source: source || 'email' }
  }
  if (medium && PAID_MEDIUM_RE.test(medium)) {
    return { channel: 'paid', source: source || host || 'paid' }
  }

  // 3. Referrer host taxonomy.
  if (!host) return { channel: 'direct', source: '(direct)' }
  if (isInternalHost(host)) return { channel: 'internal', source: host }
  for (const rule of CHANNEL_HOST_MAP) {
    if (hostMatches(host, rule.host)) return { channel: rule.channel, source: rule.source }
  }
  // Google ccTLDs (google.co.in, google.de, …) — generic catch after the
  // explicit subdomain rules above.
  if (/(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host)) {
    return { channel: 'search', source: 'google' }
  }
  if (/(^|\.)yandex\.[a-z]{2,3}$/.test(host)) {
    return { channel: 'search', source: 'yandex' }
  }

  // 4. Anything else with a real host = referral (review queue: these
  //    surface verbatim in the admin Sources panel so the map can grow).
  return { channel: 'referral', source: host }
}

/** Parse the four supported ad click-ids out of a URL query string.
 *  Values capped at 200 chars (same cap as utm capture). */
export function clickIdsFromSearch(search: string | null | undefined): ClickIds {
  const out: ClickIds = {}
  if (!search) return out
  try {
    const params = new URLSearchParams(search)
    for (const k of ['gclid', 'fbclid', 'msclkid', 'ttclid'] as const) {
      const v = params.get(k)
      if (v) out[k] = v.slice(0, 200)
    }
  } catch {
    /* malformed query — no click ids */
  }
  return out
}
