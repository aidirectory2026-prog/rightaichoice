'use client'

/**
 * Phase 9 — Bottom-sticky "Plan Your Stack" CTA card.
 *
 * Updated 2026-05-28: expanded from a one-line bar to a small floating card
 * with title + description + CTA, matching the inline card's treatment.
 * Click now routes to /plan with source + originating page encoded — the
 * signup gate fires on /plan submit, not here.
 *
 * Mounted globally via app/layout.tsx. Returns null on excluded paths
 * (see lib/cta/eligible-path.ts) and after the user dismisses (×) it
 * for this session (sessionStorage key `plan_cta_sticky_dismissed`).
 *
 * Sits above MobileNav on mobile (bottom-[68px]) so it doesn't fight the
 * existing bottom nav, and bottom-right on desktop (bottom-4 right-4).
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

  // Tool-detail pages mount a MobileActionBar pinned just above the nav
  // (bottom-[60px], ~56px tall). Sit this sticky above that bar there so the
  // two don't overlap; elsewhere the only thing below us is the 60px nav.
  const onToolDetail = (pathname ?? '').startsWith('/tools/')
  const mobileBottom = onToolDetail ? 'bottom-[128px]' : 'bottom-[72px]'

  return (
    <div
      className={`fixed ${mobileBottom} lg:bottom-4 left-3 right-3 lg:left-auto lg:right-4 lg:max-w-[320px] z-40 animate-in slide-in-from-bottom-4 duration-300`}
      role="region"
      aria-label="Plan your AI stack"
    >
      <div className="relative flex items-center gap-3 rounded-xl border border-emerald-700/50 bg-gradient-to-r from-emerald-950/95 to-zinc-900/95 backdrop-blur-md shadow-lg shadow-emerald-950/50 px-3 py-2.5 pr-7">
        {/* Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-emerald-500/40">
          <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden />
        </div>

        {/* Title + tiny description + CTA — stays compact so the bar
            doesn't fight whatever the user is actually reading. */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white leading-tight">
            Not sure which AI to pick?
          </div>
          <div className="text-[11px] text-zinc-400 leading-snug truncate">
            Tell us the goal — we&apos;ll match the stack.
          </div>
          <PlanCTAButton surface="sticky_bar" pagePath={pathname ?? ''}>
            {({ onClick }) => (
              <button
                type="button"
                onClick={onClick}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
              >
                Plan my stack →
              </button>
            )}
          </PlanCTAButton>
        </div>

        {/* Dismiss × */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 rounded-md p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}
