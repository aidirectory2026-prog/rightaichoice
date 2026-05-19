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

export function ClarityProvider() {
  const pathname = usePathname()

  useEffect(() => {
    if (!CLARITY_ID) return
    if (EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) return
    loadClarity(CLARITY_ID)
  }, [pathname])

  return null
}
