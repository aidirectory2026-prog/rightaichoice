'use client'

// Phase 10.7b (2026-06-13) — per-page web-vitals beacon.
//
// useReportWebVitals streams Core Web Vitals as they resolve (LCP, FCP,
// TTFB on load; CLS/INP refine over the page's life — all for the HARD
// page load only, soft navigations don't re-report). Sending one event per
// metric would be 5× volume for no analytical gain, so this accumulates
// them in a ref and flushes ONE `web_vitals` event per page load on the
// first of: tab hidden / pagehide / SPA route change.
//
// slow_page = any metric landed in its "poor" band per web.dev thresholds.
// Mounted once from the root layout next to GlobalInteractionTracker.

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useReportWebVitals } from 'next/web-vitals'
import { analytics } from '@/lib/analytics'

// web.dev "poor" thresholds.
const POOR: Record<string, number> = {
  LCP: 4000,
  INP: 500,
  CLS: 0.25,
  TTFB: 1800,
  FCP: 3000,
}

const METRIC_PROP: Record<string, 'lcp_ms' | 'fcp_ms' | 'ttfb_ms' | 'inp_ms' | 'cls'> = {
  LCP: 'lcp_ms',
  FCP: 'fcp_ms',
  TTFB: 'ttfb_ms',
  INP: 'inp_ms',
  CLS: 'cls',
}

export function WebVitalsTracker() {
  const pathname = usePathname()
  // Path of the HARD load these vitals describe (never updated on soft nav).
  const loadPathRef = useRef<string | null>(null)
  const metricsRef = useRef<Partial<Record<'lcp_ms' | 'fcp_ms' | 'ttfb_ms' | 'inp_ms' | 'cls', number>>>({})
  const slowRef = useRef(false)
  const flushedRef = useRef(false)

  if (loadPathRef.current === null && typeof window !== 'undefined') {
    loadPathRef.current = window.location.pathname
  }

  useReportWebVitals((metric) => {
    const prop = METRIC_PROP[metric.name]
    if (!prop) return // FID and friends — not part of this envelope
    // CLS is unitless; the ms metrics are rounded to whole milliseconds.
    metricsRef.current[prop] = prop === 'cls' ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value)
    if (metric.value > POOR[metric.name]) slowRef.current = true
  })

  useEffect(() => {
    function flush() {
      if (flushedRef.current) return
      const metrics = metricsRef.current
      const count = Object.keys(metrics).length
      if (count === 0) return // nothing reported (e.g. bfcache restore) — no noise
      flushedRef.current = true
      analytics.webVitals({
        path: loadPathRef.current ?? '/',
        ...metrics,
        metric_count: count,
        slow_page: slowRef.current,
      })
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  // SPA route change away from the measured page → flush what we have.
  useEffect(() => {
    if (loadPathRef.current !== null && pathname !== loadPathRef.current && !flushedRef.current) {
      const metrics = metricsRef.current
      const count = Object.keys(metrics).length
      if (count > 0) {
        flushedRef.current = true
        analytics.webVitals({
          path: loadPathRef.current,
          ...metrics,
          metric_count: count,
          slow_page: slowRef.current,
        })
      }
    }
  }, [pathname])

  return null
}
