import type { SentimentSource } from './types'

// Fable-5 review (2026-06-13): single source of truth for human-readable
// source names. Previously a partial map lived inline in the scan route and
// raw keys ('stackoverflow', 'hn') leaked into the user-facing report. Every
// surface that shows a source to a user must use sourceLabel().
const SOURCE_LABELS: Record<SentimentSource, string> = {
  reddit: 'Reddit',
  hn: 'Hacker News',
  youtube: 'YouTube',
  producthunt: 'Product Hunt',
  appstore: 'App Store',
  bluesky: 'Bluesky',
  stackoverflow: 'Stack Overflow',
  github: 'GitHub',
  lemmy: 'Lemmy',
  news: 'Tech Press',
  g2: 'G2',
  trustpilot: 'Trustpilot',
  google: 'Google',
  twitter: 'X',
  quora: 'Quora',
}

/** Human-readable label for a sentiment source key. Falls back to the raw
 *  key (capitalized) for anything unmapped, so a new source is never shown
 *  as an empty string. */
export function sourceLabel(source: string): string {
  return (
    SOURCE_LABELS[source as SentimentSource] ??
    source.charAt(0).toUpperCase() + source.slice(1)
  )
}
