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

  return (
    <div
      className="fixed bottom-[72px] lg:bottom-4 left-3 right-3 lg:left-auto lg:right-4 lg:max-w-sm z-40 animate-in slide-in-from-bottom-4 duration-300"
      role="region"
      aria-label="Plan your AI stack"
    >
      <div className="relative overflow-hidden rounded-2xl border border-emerald-700/50 bg-gradient-to-br from-emerald-950/95 via-zinc-950/95 to-zinc-900/95 backdrop-blur-md shadow-2xl shadow-emerald-950/60">
        {/* Dismiss × */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="absolute top-2.5 right-2.5 z-10 rounded-md p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>

        <div className="p-5 pr-9">
          {/* Kicker */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600/20 ring-1 ring-emerald-500/40">
              <Sparkles className="h-3.5 w-3.5 text-emerald-300" aria-hidden />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              AI stack planner · Free
            </span>
          </div>

          {/* Title */}
          <h3 className="text-base font-semibold text-white leading-tight">
            Pick the right AI stack in 60 seconds.
          </h3>

          {/* Description — slim version (~55 words) so it fits a floating
              panel without overwhelming the underlying page. */}
          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
            Describe what you&apos;re building in plain English. We cross-reference
            our catalog of AI tools and come back with the exact stack that fits
            your goal, budget, and existing toolchain — best pick per stage, real
            pricing, integration matches, no signup needed to see your plan.
          </p>

          {/* CTA */}
          <div className="mt-4">
            <PlanCTAButton surface="sticky_bar" pagePath={pathname ?? ''}>
              {({ onClick }) => (
                <button
                  type="button"
                  onClick={onClick}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors shadow-md shadow-emerald-950/40"
                >
                  Plan my stack →
                </button>
              )}
            </PlanCTAButton>
          </div>
        </div>
      </div>
    </div>
  )
}
