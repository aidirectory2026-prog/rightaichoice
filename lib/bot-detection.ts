// Phase 9.0.2 / 9.A.10 (2026-05-29) — single source of truth for bot + prefetch
// detection. Previously three divergent regexes existed (track-mirror, views,
// migration 097), causing inconsistent "human" counts across surfaces. This is
// the canonical one — it matches migration 097's backfill so historical rows
// stay aligned. track-mirror and views routes import from here (see 9.A.10).

export const BOT_UA_REGEX =
  /(googlebot|bingbot|yandex|duckduck|baiduspider|ahrefsbot|semrushbot|dotbot|mj12bot|blexbot|seokicks|petalbot|gptbot|claudebot|chatgpt-user|perplexitybot|anthropic-ai|applebot|facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|whatsapp|skypeuripreview|amazonbot|oai-searchbot|tpcworker|newsai\/|crawl|spider|slurp|headlesschrome|phantomjs|electron|playwright|puppeteer|python-requests|curl\/|wget\/|postman|scrapy|httpclient|node-fetch|^axios)/i

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return true // no UA → treat as bot/automated
  return BOT_UA_REGEX.test(ua)
}

// Phase 10.2 (F7) — the UA regex alone had ~30% recall: datacenter farms ride
// stock desktop-Chrome UA strings that are merely YEARS out of date, and
// canary/dev builds (patch component < 10) never belong to organic visitors.
// Bump CURRENT_CHROME_MAJOR every few months (stable channel major).
const CURRENT_CHROME_MAJOR = 142

// Desktop Chrome ≥9 majors behind current (≈ >1 year unpatched) on a
// self-updating browser ⇒ datacenter UA rotation, not a person. Excludes
// Edge/Opera/Brave tokens (separate version lines) and mobile (slower OEM rollouts).
export function isStaleChromeUA(ua: string | null | undefined): boolean {
  if (!ua) return false
  if (/(edg|opr|brave|mobile|android|iphone|ipad)/i.test(ua)) return false
  const m = ua.match(/Chrome\/(\d+)\./)
  if (!m) return false
  return Number(m[1]) <= CURRENT_CHROME_MAJOR - 9
}

// Chrome canary/dev build strings: stable patch components are 2-3 digits
// (e.g. 142.0.7444.175); a single-digit patch (141.0.7390.0, 139.0.7258.5)
// is a dev build — automation, not a person.
export function isDevBuildChromeUA(ua: string | null | undefined): boolean {
  if (!ua) return false
  return /Chrome\/\d+\.0\.\d{3,5}\.\d(?!\d)/.test(ua)
}

// Full analytics-side bot verdict (used when FLAGGING events, not when gating
// redirects): regex + staleness + dev-build heuristics.
export function isLikelyBotUA(ua: string | null | undefined): boolean {
  return isBotUserAgent(ua) || isStaleChromeUA(ua) || isDevBuildChromeUA(ua)
}

// Speculative/prefetch loads must never be counted as human clicks. Covers
// Chrome Speculation Rules (Sec-Purpose), legacy Purpose/X-Purpose, Firefox
// X-Moz, and Next.js router prefetch.
export function isPrefetchRequest(headers: Headers): boolean {
  const secPurpose = headers.get('sec-purpose') ?? ''
  if (secPurpose.includes('prefetch') || secPurpose.includes('prerender')) return true
  const purpose = (headers.get('purpose') ?? headers.get('x-purpose') ?? '').toLowerCase()
  if (purpose === 'prefetch' || purpose === 'preview') return true
  if ((headers.get('x-moz') ?? '').toLowerCase() === 'prefetch') return true
  if (headers.get('next-router-prefetch')) return true
  return false
}

// Convenience: a request that should NOT be counted as a real human interaction.
// `method` lets callers exclude auto-derived HEAD (Next runs GET for HEAD).
export function isNonHumanRequest(headers: Headers, method?: string): boolean {
  if (method && method.toUpperCase() === 'HEAD') return true
  if (isPrefetchRequest(headers)) return true
  return isBotUserAgent(headers.get('user-agent'))
}
