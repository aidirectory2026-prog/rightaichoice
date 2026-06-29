// Phase 13 Social — shared helpers (UTM tagging + canonicalisation + X length).

import type { Platform } from './types'

/** Append UTM params so Google Analytics attributes social traffic per platform. */
export function withUtm(url: string, platform: Platform, campaign = 'rac_social'): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', platform)
    u.searchParams.set('utm_medium', 'social')
    u.searchParams.set('utm_campaign', campaign)
    return u.toString()
  } catch {
    return url // non-absolute / invalid → leave untouched
  }
}

/** Strip utm_* params → the canonical link, used for dedup so the same destination
 *  isn't re-shared just because its tracking tags differ per platform/date. */
export function canonicalLink(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const u = new URL(url)
    for (const k of [...u.searchParams.keys()]) if (k.startsWith('utm_')) u.searchParams.delete(k)
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return url
  }
}

// X wraps every URL to a fixed 23 chars via t.co regardless of the real length, so
// a long UTM link costs 23 against the 280 limit — not its literal length. Count
// the way X counts, so we don't reject a tweet X would happily accept.
const TCO_LEN = 23
const URL_RE = /https?:\/\/\S+/g
export function xEffectiveLength(text: string): number {
  const urls = text.match(URL_RE) ?? []
  const urlsLen = urls.reduce((s, u) => s + u.length, 0)
  return text.length - urlsLen + urls.length * TCO_LEN
}
