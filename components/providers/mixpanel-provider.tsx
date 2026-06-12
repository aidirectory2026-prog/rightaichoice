'use client'

import { Suspense, useEffect, useRef } from 'react'
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

// Phase 8.g.1 — session replay moved to Microsoft Clarity (free, unlimited).
// All record_* config dropped below. REPLAY_EXCLUDED_PATHS no longer used.

// Compute device_type from viewport so every event splits mobile / tablet /
// desktop without joining other tables.
function computeDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 640) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

// sessionStorage-backed session counter. Tab open → fresh session number,
// reload → same number. Counter persists across tabs via localStorage so the
// nth-session attribution is stable per device.
function nextSessionN(): number {
  if (typeof window === 'undefined') return 0
  try {
    const KEY = 'rac_mp_session_n'
    const prev = Number(sessionStorage.getItem(KEY) || '0')
    if (prev > 0) return prev
    const n = Number(localStorage.getItem(KEY) || '0') + 1
    localStorage.setItem(KEY, String(n))
    sessionStorage.setItem(KEY, String(n))
    return n
  } catch {
    return 0
  }
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

// Phase 8.g.1 fix (2026-05-20) — exported so AuthProvider can re-register
// the full static super-prop set after a real logout. mixpanel.reset()
// clears ALL super-properties; loaded() only fires once per SDK init, so
// callers that reset() must call this helper to restore the static set.
export function registerAnonSuperProps() {
  if (!initialized) return
  let networkType: string = 'unknown'
  try {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection
    if (conn?.effectiveType) networkType = conn.effectiveType
  } catch {
    // ignore
  }
  mixpanel.register({
    app: 'rightaichoice',
    app_version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
    viewport:
      typeof window !== 'undefined'
        ? `${window.innerWidth}x${window.innerHeight}`
        : 'unknown',
    env: process.env.NODE_ENV,
    device_type: computeDeviceType(),
    session_n: nextSessionN(),
    auth_state: 'anon',
    network_type: networkType,
  })
}

function initMixpanelOnce() {
  if (initialized || !MIXPANEL_TOKEN) return
  mixpanel.init(MIXPANEL_TOKEN, {
    api_host: MIXPANEL_API_HOST,
    track_pageview: false,
    persistence: 'localStorage',
    ignore_dnt: false,
    // Phase 8.g.1 — anon→known identity merge is configured at the PROJECT
    // level in Mixpanel (Project Settings → Identity Merge → "Simplified").
    // New projects default to Simplified, so identify() alone reliably merges
    // the anon distinct_id into the user_id profile — no explicit alias() needed.
    // Verify the project setting once at https://eu.mixpanel.com/project/4014921/settings.
    //
    // Session replay disabled here — handled by Microsoft Clarity (free,
    // unlimited). All record_* config removed.
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
      // Every-session super properties — attached to every event. Phase 8.g.1
      // adds device_type, session_n (per-tab counter), and auth_state
      // (toggled by AuthProvider on identify/reset).
      // Phase 8.g.11.d — read network type for slow-connection segmentation.
      // navigator.connection is experimental in Safari but widely supported
      // in Chromium browsers; falls back to 'unknown' otherwise.
      let networkType: string = 'unknown'
      try {
        const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection
        if (conn?.effectiveType) networkType = conn.effectiveType
      } catch {
        // ignore — Safari throws on access
      }
      mp.register({
        app: 'rightaichoice',
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
        viewport:
          typeof window !== 'undefined'
            ? `${window.innerWidth}x${window.innerHeight}`
            : 'unknown',
        env: process.env.NODE_ENV,
        device_type: computeDeviceType(),
        session_n: nextSessionN(),
        auth_state: 'anon',
        network_type: networkType,
      })
    },
  })
  initialized = true
}

function PageViewCapture() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // 9.A.1 #8 — fire page_viewed once per PATHNAME, not on every querystring
  // change. Applying a filter / paginating / search (?q=, ?page=) previously
  // fired a fresh page_viewed, inflating "page views" vs real page loads.
  const lastPathRef = useRef<string | null>(null)

  useEffect(() => {
    if (!MIXPANEL_TOKEN) return
    initMixpanelOnce()

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')

    // UTM handling stays responsive to query changes (campaign links).
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

    // Phase 8.g.1 — update page_path super-prop on every route change so
    // EVERY subsequent event carries the current page without manual passing.
    mixpanel.register({ page_path: pathname })

    // Only emit page_viewed when the pathname actually changed.
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname
      analytics.pageViewed(
        pathname,
        url,
        typeof document !== 'undefined' ? document.referrer : '',
      )
    }
  }, [pathname, searchParams])

  return null
}

// Scroll depth + time-on-page beacon + engaged-time heartbeat. Resets on
// each pathname change so each page gets its own measurements. Fires at
// 10/25/50/75/90/100% depth exactly once per page (10.7c widened from
// 25/50/75/100), a single `time_on_page` on unload (UNCHANGED semantics —
// the nightly behavioral bot classifier reads it; 10.7c only adds the
// optional max_scroll_pct property), and an `engaged_time_heartbeat`
// every 30s of wall time carrying REAL attention seconds (tab visible +
// input/scroll within the previous 15s), skipped when zero, capped at 40
// beats (~20 min) per page.
const ENGAGED_IDLE_MS = 15_000 // input within this window = attentive
const HEARTBEAT_EVERY_TICKS = 30 // 1s ticks per heartbeat
const HEARTBEAT_MAX_PER_PAGE = 40

function EngagementCapture() {
  const pathname = usePathname()
  const firedDepthsRef = useRef<Set<number>>(new Set())
  const mountedAtRef = useRef<number>(Date.now())
  // 9.A.1 #9 — emit time_on_page AT MOST ONCE per page. It previously fired on
  // pagehide AND visibilitychange→hidden AND unmount, so a tab-switch-then-
  // navigate counted 2–3× and inflated time_on_page volume.
  const timeFiredRef = useRef<boolean>(false)
  // 10.7c — deepest scroll position reached on this page (0-100).
  const maxScrollPctRef = useRef<number>(0)
  // 10.7c — engaged-time accounting (1s tick, see interval below).
  const lastActivityRef = useRef<number>(Date.now())
  const engagedTotalRef = useRef<number>(0)
  const engagedDeltaRef = useRef<number>(0)
  const heartbeatsSentRef = useRef<number>(0)
  const tickCountRef = useRef<number>(0)

  useEffect(() => {
    firedDepthsRef.current = new Set()
    mountedAtRef.current = Date.now()
    timeFiredRef.current = false
    maxScrollPctRef.current = 0
    lastActivityRef.current = Date.now()
    engagedTotalRef.current = 0
    engagedDeltaRef.current = 0
    heartbeatsSentRef.current = 0
    tickCountRef.current = 0

    function computeDepth(): number {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - doc.clientHeight
      if (scrollable <= 0) return 100
      const pct = (window.scrollY / scrollable) * 100
      return Math.min(100, Math.max(0, pct))
    }

    function onScroll() {
      lastActivityRef.current = Date.now()
      const pct = computeDepth()
      if (pct > maxScrollPctRef.current) maxScrollPctRef.current = pct
      for (const threshold of [10, 25, 50, 75, 90, 100] as const) {
        if (pct >= threshold && !firedDepthsRef.current.has(threshold)) {
          firedDepthsRef.current.add(threshold)
          analytics.scrollDepthReached(pathname, threshold)
        }
      }
    }

    function emitTimeOnPage() {
      if (timeFiredRef.current) return
      const seconds = Math.floor((Date.now() - mountedAtRef.current) / 1000)
      if (seconds < 1) return
      timeFiredRef.current = true
      analytics.timeOnPage(pathname, seconds, maxScrollPctRef.current)
    }

    // 10.7c — attention markers. Passive + cheap: a timestamp write.
    const markActivity = () => {
      lastActivityRef.current = Date.now()
    }

    // 1s engaged-time tick: a second counts when the tab is visible AND
    // there was input/scroll within the previous 15s. Every 30 ticks, flush
    // a heartbeat if any engaged seconds accrued.
    const interval = setInterval(() => {
      const now = Date.now()
      if (document.visibilityState === 'visible' && now - lastActivityRef.current < ENGAGED_IDLE_MS) {
        engagedTotalRef.current += 1
        engagedDeltaRef.current += 1
      }
      tickCountRef.current += 1
      if (tickCountRef.current % HEARTBEAT_EVERY_TICKS === 0) {
        if (engagedDeltaRef.current > 0 && heartbeatsSentRef.current < HEARTBEAT_MAX_PER_PAGE) {
          heartbeatsSentRef.current += 1
          analytics.engagedTimeHeartbeat({
            path: pathname,
            heartbeat_n: heartbeatsSentRef.current,
            engaged_seconds_delta: engagedDeltaRef.current,
            engaged_seconds_total: engagedTotalRef.current,
          })
        }
        engagedDeltaRef.current = 0
      }
    }, 1000)

    // Passive listeners — never block scroll/input performance.
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', markActivity, { passive: true })
    window.addEventListener('keydown', markActivity, { passive: true })
    window.addEventListener('pointermove', markActivity, { passive: true })
    window.addEventListener('touchstart', markActivity, { passive: true })
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
      clearInterval(interval)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointerdown', markActivity)
      window.removeEventListener('keydown', markActivity)
      window.removeEventListener('pointermove', markActivity)
      window.removeEventListener('touchstart', markActivity)
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
      {/* Phase 10 #63 — PageViewCapture reads useSearchParams(); without a
          Suspense boundary that de-opts EVERY page to dynamic rendering. Isolate
          it so content pages can be statically generated again. */}
      <Suspense fallback={null}>
        <PageViewCapture />
      </Suspense>
      <EngagementCapture />
      {children}
    </>
  )
}
