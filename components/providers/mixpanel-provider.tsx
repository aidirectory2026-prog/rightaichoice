'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import mixpanel from 'mixpanel-browser'
import { analytics } from '@/lib/analytics'

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN
// Proxy path defeats ad-blockers (uBlock, Brave shields, etc.). When set to
// "/mp", events route through our own domain to app/mp/[...path]/route.ts
// which forwards to Mixpanel. Falls back to the public EU API host.
const MIXPANEL_PROXY_PATH = process.env.NEXT_PUBLIC_MIXPANEL_PROXY_PATH
const MIXPANEL_API_HOST =
  MIXPANEL_PROXY_PATH ||
  process.env.NEXT_PUBLIC_MIXPANEL_API_HOST ||
  'https://api-eu.mixpanel.com'

const REPLAY_EXCLUDED_PATHS = ['/auth', '/login', '/signup', '/account', '/admin', '/api']

function shouldReplayOnPath(pathname: string): boolean {
  return !REPLAY_EXCLUDED_PATHS.some((p) => pathname.startsWith(p))
}

function parseUtm(searchParams: URLSearchParams) {
  const utm: Record<string, string> = {}
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const v = searchParams.get(key)
    if (v) utm[key] = v
  }
  return utm
}

let initialized = false

function initMixpanelOnce() {
  if (initialized || !MIXPANEL_TOKEN) return
  mixpanel.init(MIXPANEL_TOKEN, {
    api_host: MIXPANEL_API_HOST,
    track_pageview: false,
    persistence: 'localStorage',
    ignore_dnt: false,
    // Session Replay — 5% of sessions (~1500/mo at 30k). Mask text inputs +
    // password/email-type inputs by default. Replay excluded on auth/account
    // paths (see onRouteChange below which toggles start_recording).
    record_sessions_percent: 5,
    record_mask_text_selector: 'input, textarea, [data-private]',
    record_block_selector: '[data-private-block], [data-mp-block]',
    record_collect_fonts: false,
    // Batching — reduces event loss to network blips; 10s flush is snappy
    // enough for funnel analysis and well within free-tier volume.
    batch_requests: true,
    batch_flush_interval_ms: 10_000,
    loaded: (mp) => {
      // First-touch attribution: capture once, never overwrite. register_once
      // is persisted in localStorage so the original UTM/referrer sticks to
      // the user even after the URL changes.
      const ref = typeof document !== 'undefined' ? document.referrer : ''
      mp.register_once({
        first_touch_referrer: ref || 'direct',
        first_touch_landing: typeof window !== 'undefined' ? window.location.pathname : '',
      })
      // Every-session super properties — attached to every event.
      mp.register({
        app: 'rightaichoice',
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
        viewport:
          typeof window !== 'undefined'
            ? `${window.innerWidth}x${window.innerHeight}`
            : 'unknown',
        env: process.env.NODE_ENV,
      })
    },
  })
  initialized = true
}

function PageViewCapture() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!MIXPANEL_TOKEN) return
    initMixpanelOnce()

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')

    // Persist first-touch UTM (register_once — sticks forever per device).
    const utm = parseUtm(searchParams)
    if (Object.keys(utm).length > 0) {
      mixpanel.register_once(
        Object.fromEntries(Object.entries(utm).map(([k, v]) => [`first_touch_${k}`, v])),
      )
      // Last-touch UTM (register — overwrites, useful for campaign
      // attribution on the current session).
      mixpanel.register(
        Object.fromEntries(Object.entries(utm).map(([k, v]) => [`last_touch_${k}`, v])),
      )
    }

    // Toggle session replay per-path so we never record auth/account flows
    // even at 5% sampling.
    if (shouldReplayOnPath(pathname)) {
      mixpanel.start_session_recording?.()
    } else {
      mixpanel.stop_session_recording?.()
    }

    mixpanel.track('page_viewed', {
      path: pathname,
      url,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    })
  }, [pathname, searchParams])

  return null
}

// Scroll depth + time-on-page beacon. Resets on each pathname change so each
// page gets its own depth/time measurement. Fires at 25/50/75/100% depth
// exactly once per page, and a single `time_on_page` on unload.
function EngagementCapture() {
  const pathname = usePathname()
  const firedDepthsRef = useRef<Set<number>>(new Set())
  const mountedAtRef = useRef<number>(Date.now())

  useEffect(() => {
    firedDepthsRef.current = new Set()
    mountedAtRef.current = Date.now()

    function computeDepth(): number {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - doc.clientHeight
      if (scrollable <= 0) return 100
      const pct = (window.scrollY / scrollable) * 100
      return Math.min(100, Math.max(0, pct))
    }

    function onScroll() {
      const pct = computeDepth()
      for (const threshold of [25, 50, 75, 100] as const) {
        if (pct >= threshold && !firedDepthsRef.current.has(threshold)) {
          firedDepthsRef.current.add(threshold)
          analytics.scrollDepthReached(pathname, threshold)
        }
      }
    }

    function emitTimeOnPage() {
      const seconds = Math.floor((Date.now() - mountedAtRef.current) / 1000)
      if (seconds < 1) return
      analytics.timeOnPage(pathname, seconds)
    }

    // Passive listener — never blocks scroll performance.
    window.addEventListener('scroll', onScroll, { passive: true })
    // pagehide is more reliable than beforeunload on mobile Safari.
    window.addEventListener('pagehide', emitTimeOnPage)
    // visibilitychange hidden → tab-switch / minimize counts as session exit.
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') emitTimeOnPage()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Fire once on mount in case the page is already short enough to be 100%.
    onScroll()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', emitTimeOnPage)
      document.removeEventListener('visibilitychange', onVisibility)
      // Emit on unmount (route change) so SPA navigation still records time.
      emitTimeOnPage()
    }
  }, [pathname])

  return null
}

export function MixpanelProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initMixpanelOnce()
  }, [])

  if (!MIXPANEL_TOKEN) return <>{children}</>

  return (
    <>
      <PageViewCapture />
      <EngagementCapture />
      {children}
    </>
  )
}
