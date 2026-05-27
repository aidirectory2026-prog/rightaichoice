'use client'

/**
 * Phase 9 — Plan-Your-Stack signup modal.
 *
 * Intercepts the "Plan My Stack" click for ANONYMOUS users only. Offers
 * Google / LinkedIn OAuth (one-tap signup) + a skip link. Either path
 * lands the user on /plan with their typed goal preserved.
 *
 * Goal preservation strategy:
 *   - Skip path: persistPlanIntent({ signup_outcome: 'skipped' }) then
 *     router.push(/plan?q=…). Goal lives in URL + plan_intents table.
 *   - OAuth path: stashPendingIntent() before redirecting away; auth-provider
 *     reads the stash post-callback and persists with completed_* outcome.
 *
 * Authenticated users: this modal never opens; the CTA goes straight to
 * /plan?q=…. The shared PlanCTAButton handles the branch.
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, Sparkles, ArrowRight } from 'lucide-react'
import { signInWithGoogle, signInWithLinkedIn } from '@/actions/auth'
import { GoogleIcon } from '@/components/shared/google-icon'
import { analytics } from '@/lib/analytics'
import { persistPlanIntent, stashPendingIntent } from '@/lib/cta/persist-intent'

type Props = {
  open: boolean
  onClose: () => void
  typedGoal: string
  sourceSurface: 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage'
  /** Called after Skip persist completes, before router.push. */
  onAfterSkip?: () => void
}

export function PlanSignupModal({ open, onClose, typedGoal, sourceSurface, onAfterSkip }: Props) {
  const router = useRouter()
  const shownFiredRef = useRef(false)

  useEffect(() => {
    if (!open) {
      shownFiredRef.current = false
      return
    }
    if (!shownFiredRef.current) {
      shownFiredRef.current = true
      analytics.planSignupModalShown({
        source_surface: sourceSurface,
        typed_goal_char_count: typedGoal.length,
      })
    }
    // Esc to close
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, sourceSurface, typedGoal.length, onClose])

  if (!open) return null

  function nextUrl() {
    const q = typedGoal.trim()
    return q ? `/plan?q=${encodeURIComponent(q)}&source=${sourceSurface}` : `/plan?source=${sourceSurface}`
  }

  // Capture the page the user was on BEFORE any OAuth navigation. Used by
  // both branches so plan_intents.source_path reflects the original CTA-click
  // page even when the OAuth round-trip rewrites Referer.
  function currentPagePath(): string {
    if (typeof window === 'undefined') return ''
    return window.location.pathname || ''
  }

  function handleOAuth(provider: 'google' | 'linkedin') {
    analytics.planSignupModalOAuthClicked({ provider })
    // Stash goal + original page so auth-provider can persist them after
    // the OAuth round-trip with full provenance intact.
    if (typedGoal.trim()) stashPendingIntent(typedGoal, sourceSurface, currentPagePath())
    sessionStorage.setItem('plan_signup_provider', provider)

    const fd = new FormData()
    fd.set('next', nextUrl())
    if (provider === 'google') signInWithGoogle(fd)
    else signInWithLinkedIn(fd)
  }

  function handleSkip() {
    analytics.planSignupModalSkipped({ typed_goal_char_count: typedGoal.length })
    if (typedGoal.trim()) {
      void persistPlanIntent({
        typed_goal: typedGoal,
        source_surface: sourceSurface,
        signup_outcome: 'skipped',
        page_path: currentPagePath(),
      })
    }
    onAfterSkip?.()
    onClose()
    router.push(nextUrl())
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign up to save your AI stack"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 rounded-md p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 ring-1 ring-emerald-500/40">
            <Sparkles className="h-5 w-5 text-emerald-300" aria-hidden />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">
            Save your custom AI stack
          </h2>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-sm">
            It's <span className="text-emerald-300 font-medium">free</span> and takes 5 seconds. We'll save your stack to your dashboard so you can revisit, compare, and share it anytime.
          </p>
        </div>

        <div className="mt-6 space-y-2.5">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-white hover:bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('linkedin')}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-[#0A66C2] hover:bg-[#0958A8] px-4 py-3 text-sm font-semibold text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Continue with LinkedIn
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <button
            type="button"
            onClick={handleSkip}
            className="group inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip & continue as guest
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" aria-hidden />
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-zinc-600">
          We'll never post on your behalf or email you without permission.
        </p>
      </div>
    </div>
  )
}
