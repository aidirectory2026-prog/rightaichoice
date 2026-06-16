'use client'

// Phase 8.g.1 (2026-05-20) — Microsoft Clarity session replay + heatmaps.
// Free forever, unlimited replays. Replaces Mixpanel session replay.
//
// Privacy: Clarity auto-masks <input type="password|email"> and any element
// with data-clarity-mask. Sensitive paths (/admin, /api, /auth) skipped via
// the early-return below — same exclusion list as previous Mixpanel replay.
//
// Project ID set via NEXT_PUBLIC_CLARITY_PROJECT_ID (currently wtq115a7o7).

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getMixpanelDistinctId } from '@/lib/analytics'

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID
const EXCLUDED_PATHS = ['/admin', '/api', '/auth']
const SCRIPT_ID = 'clarity-tag-script'

let loaded = false

function loadClarity(projectId: string) {
  if (loaded || typeof window === 'undefined') return
  if (document.getElementById(SCRIPT_ID)) {
    loaded = true
    return
  }
  // Initialize the global clarity queue exactly as the official snippet does.
  // Using bracket access to avoid TypeScript ambient-global declarations.
  const w = window as unknown as Record<string, unknown>
  if (typeof w['clarity'] !== 'function') {
    const queue: unknown[][] = []
    const stub = function (...args: unknown[]) {
      queue.push(args)
    }
    ;(stub as unknown as { q: unknown[][] }).q = queue
    w['clarity'] = stub
  }
  // Inject the script tag — no inline HTML, so no XSS surface.
  const s = document.createElement('script')
  s.id = SCRIPT_ID
  s.async = true
  s.src = `https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`
  const first = document.getElementsByTagName('script')[0]
  if (first?.parentNode) {
    first.parentNode.insertBefore(s, first)
  } else {
    document.head.appendChild(s)
  }
  loaded = true
}

// Clarity's user (_clck) and session (_clsk) cookies each pack several fields
// delimited by "^" (newer) or "|" (older); the FIRST segment is the id we need
// to rebuild a player deep-link. Read them in the visitor's own browser — the
// admin can never see another user's cookies, so reconstruction must happen at
// capture time.
function clarityCookieId(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]+)'))
  if (!m) return null
  try {
    const value = decodeURIComponent(m[1])
    const parts = value.includes('^') ? value.split('^') : value.split('|')
    return parts[0] || null
  } catch {
    return null
  }
}

// Once Clarity loads: (1) identify the session with OUR distinct_id (+ optional
// friendly name) via the official Identify API, so every recording is filterable
// by the same distinct_id the admin user-360 page is keyed on; (2) forward the
// session id AND a reconstructed player deep-link
// (clarity.microsoft.com/player/<project>/<userId>/<sessionId>) to Mixpanel as
// super-props, so /api/track-mirror persists them and the admin can one-click the
// exact replay. The player URL needs the Clarity USER id (from _clck) — which we
// never captured before, the reason the admin link could only reach the dashboard.
function bridgeClarity(projectId: string, distinctId: string | null, friendlyName: string | null) {
  if (typeof window === 'undefined') return
  const w = window as unknown as Record<string, unknown>
  const clarity = w['clarity'] as ((...args: unknown[]) => void) | undefined
  if (typeof clarity !== 'function') return
  try {
    if (distinctId) clarity('identify', distinctId, undefined, undefined, friendlyName ?? undefined)
  } catch { /* identify is best-effort */ }
  try {
    clarity('get', 'session', (sessionId: string) => {
      const clarityUserId = clarityCookieId('_clck')
      const claritySessionId = clarityCookieId('_clsk') || sessionId
      const playbackUrl =
        clarityUserId && claritySessionId
          ? `https://clarity.microsoft.com/player/${projectId}/${clarityUserId}/${claritySessionId}`
          : null
      const props: Record<string, string> = {}
      if (sessionId) props.clarity_session_id = sessionId
      if (playbackUrl) props.clarity_playback_url = playbackUrl
      if (Object.keys(props).length === 0) return
      // Lazy-import mixpanel-browser so non-Mixpanel pages don't load it.
      import('mixpanel-browser').then(({ default: mp }) => {
        try {
          mp.register(props)
        } catch {
          setTimeout(() => { try { mp.register(props) } catch { /* swallow */ } }, 500)
        }
      }).catch(() => { /* mixpanel-browser unavailable, ignore */ })
    })
  } catch {
    setTimeout(() => bridgeClarity(projectId, distinctId, friendlyName), 1000)
  }
}

export function ClarityProvider() {
  const pathname = usePathname()

  useEffect(() => {
    if (!CLARITY_ID) return
    if (EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) return
    loadClarity(CLARITY_ID)
    const projectId = CLARITY_ID
    // Wait for Clarity's <script> to finish loading before identifying + asking
    // for the session ID. The 2s delay is generous — Clarity usually finishes
    // bootstrapping in ~800ms even on slow connections. distinct_id is our own
    // cross-tab id (the same one the admin user-360 page is keyed on).
    const t = setTimeout(
      () => bridgeClarity(projectId, getMixpanelDistinctId(), null),
      2000,
    )
    return () => clearTimeout(t)
  }, [pathname])

  return null
}
