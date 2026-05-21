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

// Phase 8.g.10 — once Clarity loads, ask for the session ID and forward
// it to Mixpanel as a super-prop so EVERY event carries clarity_session_id.
// /api/track-mirror then lifts it from properties to its own column, so
// the per-user timeline page can deep-link to the Clarity replay.
function bridgeClaritySessionToMixpanel() {
  if (typeof window === 'undefined') return
  const w = window as unknown as Record<string, unknown>
  const clarity = w['clarity'] as ((cmd: string, key: string, cb: (val: string) => void) => void) | undefined
  if (typeof clarity !== 'function') return
  try {
    clarity('get', 'session', (sessionId: string) => {
      if (!sessionId) return
      // Lazy-import mixpanel-browser so non-Mixpanel pages don't load it.
      import('mixpanel-browser').then(({ default: mp }) => {
        try {
          mp.register({ clarity_session_id: sessionId })
        } catch {
          // Mixpanel not initialised yet — try once on next tick.
          setTimeout(() => {
            try { mp.register({ clarity_session_id: sessionId }) } catch { /* swallow */ }
          }, 500)
        }
      }).catch(() => { /* mixpanel-browser unavailable, ignore */ })
    })
  } catch {
    // Clarity not fully loaded yet — try once more after a delay.
    setTimeout(bridgeClaritySessionToMixpanel, 1000)
  }
}

export function ClarityProvider() {
  const pathname = usePathname()

  useEffect(() => {
    if (!CLARITY_ID) return
    if (EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) return
    loadClarity(CLARITY_ID)
    // Wait for Clarity's <script> to finish loading before asking for the
    // session ID. The 2s delay is generous — Clarity usually finishes
    // bootstrapping in ~800ms even on slow connections.
    const t = setTimeout(bridgeClaritySessionToMixpanel, 2000)
    return () => clearTimeout(t)
  }, [pathname])

  return null
}
