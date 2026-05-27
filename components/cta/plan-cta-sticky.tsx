'use client'

/**
 * Phase 9 — Bottom-sticky "Plan Your Stack" CTA.
 *
 * Mounted globally via app/layout.tsx. Returns null on excluded paths
 * (see lib/cta/eligible-path.ts) and after the user dismisses (×) it
 * for this session (sessionStorage key `plan_cta_sticky_dismissed`).
 *
 * Sits above MobileNav (bottom-0 left-0 right-0 z-40) so it stacks with
 * the existing 60px mobile nav without overlap.
 *
 * Click → opens the PlanSignupModal for anon users or goes straight to
 * /plan for authenticated users (delegated to the shared PlanCTAButton).
 */

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { isEligibleForCTA } from '@/lib/cta/eligible-path'
import { analytics } from '@/lib/analytics'
import { PlanCTAButton } from './plan-cta-button'

const DISMISS_KEY = 'plan_cta_sticky_dismissed'

export function PlanCTASticky() {
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const impressionFiredRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    }
  }, [])

  const eligible = isEligibleForCTA(pathname)
  const visible = mounted && eligible && !dismissed

  // Fire impression event once per page-mount when visible.
  useEffect(() => {
    if (!visible || impressionFiredRef.current) return
    impressionFiredRef.current = true
    analytics.planCtaImpression({ surface: 'sticky_bar', page_path: pathname ?? '' })
  }, [visible, pathname])

  // Reset impression flag on path change so it re-fires on the new page.
  useEffect(() => {
    impressionFiredRef.current = false
  }, [pathname])

  function handleDismiss() {
    setDismissed(true)
    if (typeof window !== 'undefined') sessionStorage.setItem(DISMISS_KEY, '1')
    analytics.planCtaDismissed({ surface: 'sticky_bar', page_path: pathname ?? '' })
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-[64px] lg:bottom-3 left-3 right-3 lg:left-auto lg:right-3 lg:max-w-md z-40 animate-in slide-in-from-bottom-4 duration-300"
      role="region"
      aria-label="Plan your AI stack"
    >
      <div className="flex items-center gap-3 rounded-xl border border-emerald-700/50 bg-gradient-to-r from-emerald-950/95 to-zinc-900/95 backdrop-blur-md shadow-lg shadow-emerald-950/50 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-emerald-500/40">
          <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            Pick the right AI stack in 60s
          </div>
          <div className="text-xs text-zinc-400 truncate">
            Skip the research — describe your goal, we'll match the tools.
          </div>
        </div>
        <PlanCTAButton surface="sticky_bar" pagePath={pathname ?? ''}>
          {({ onClick }) => (
            <button
              type="button"
              onClick={onClick}
              className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors whitespace-nowrap"
            >
              Plan my stack →
            </button>
          )}
        </PlanCTAButton>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
