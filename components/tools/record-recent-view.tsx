'use client'

import { useEffect } from 'react'

const COOKIE_NAME = 'rac_recent'
const MAX_ITEMS = 5
const COOKIE_DAYS = 30

/**
 * Phase 6.4 (2026-05-11): records each visited tool slug into a client-set
 * cookie ('rac_recent') so the homepage and /tools index can render a
 * "Recently viewed" rail without round-tripping a server action. Cookie
 * holds the most-recent N slugs, newest first, deduplicated. Stays
 * client-side for performance — the read site (server component) parses
 * it via next/headers cookies(). 30-day expiry; SameSite=Lax so it ships
 * back on the same-origin GET that renders the homepage.
 *
 * Renders nothing — pure side-effect component. Mount once per tool
 * detail page.
 */
export function RecordRecentView({ slug }: { slug: string }) {
  useEffect(() => {
    if (typeof document === 'undefined') return
    try {
      const raw = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${COOKIE_NAME}=`))
        ?.split('=')[1]
      const existing: string[] = raw ? JSON.parse(decodeURIComponent(raw)) : []
      const next = [slug, ...existing.filter((s) => s !== slug)].slice(0, MAX_ITEMS)
      const value = encodeURIComponent(JSON.stringify(next))
      const expires = new Date()
      expires.setDate(expires.getDate() + COOKIE_DAYS)
      document.cookie = `${COOKIE_NAME}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
    } catch {
      // Cookie parse can fail on malformed JSON from a previous version;
      // overwrite with a clean single-entry list rather than crash.
      const value = encodeURIComponent(JSON.stringify([slug]))
      const expires = new Date()
      expires.setDate(expires.getDate() + COOKIE_DAYS)
      document.cookie = `${COOKIE_NAME}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
    }
  }, [slug])

  return null
}
