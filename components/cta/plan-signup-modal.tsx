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
import { X, Sparkles, ArrowRight, Mail } from 'lucide-react'
import { signInWithOAuthClient } from '@/lib/auth/oauth-client'
import { continueAsGuest } from '@/lib/auth/guest-client'
import { GoogleSignInButton } from '@/components/auth/google-signin-button'
import { analytics } from '@/lib/analytics'
import { persistPlanIntent, stashPendingIntent } from '@/lib/cta/persist-intent'

type Props = {
  open: boolean
  onClose: () => void
  typedGoal: string
  sourceSurface: 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage' | 'plan_page'
  /** Called after Skip persist completes, before any internal navigation. */
  onAfterSkip?: () => void
  /**
   * When false, the modal's Skip handler does NOT router.push to /plan —
   * the parent (e.g. ProjectPlanner on /plan itself) takes over via
   * onAfterSkip. Defaults to true for the homepage/CTA-popup callers.
   */
  redirectOnSkip?: boolean
  /**
   * Original page the user was on when they entered the funnel — used as
   * plan_intents.source_path so attribution survives the OAuth round-trip
   * and the /plan landing. Falls back to window.location.pathname.
   */
  originalPagePath?: string
}

export function PlanSignupModal({
  open,
  onClose,
  typedGoal,
  sourceSurface,
  onAfterSkip,
  redirectOnSkip = true,
  originalPagePath,
}: Props) {
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
    // Lock body scroll while the modal is open so the page behind doesn't
    // scroll under the overlay; restore the prior value on close/unmount.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, sourceSurface, typedGoal.length, onClose])

  if (!open) return null

  function nextUrl() {
    const q = typedGoal.trim()
    return q ? `/plan?q=${encodeURIComponent(q)}&source=${sourceSurface}` : `/plan?source=${sourceSurface}`
  }

  // Capture the page the user was on BEFORE any OAuth navigation. Used by
  // both branches so plan_intents.source_path reflects the original CTA-click
  // page even when the OAuth round-trip rewrites Referer. If the parent
  // already knows the original page (e.g. ProjectPlanner read ?from= from
  // the URL), prefer that — otherwise fall back to window.location.
  function effectivePagePath(): string {
    if (originalPagePath) return originalPagePath
    if (typeof window === 'undefined') return ''
    return window.location.pathname || ''
  }

  function handleOAuth(provider: 'google' | 'linkedin') {
    analytics.planSignupModalOAuthClicked({ provider })
    // Stash goal + original page so auth-provider can persist them after
    // the OAuth round-trip with full provenance intact.
    if (typedGoal.trim()) {
      stashPendingIntent(typedGoal, sourceSurface, effectivePagePath())
      // Attribution-fix (2026-06-10) — ALSO persist immediately (keepalive,
      // fire-and-forget, outcome='unknown') so the typed goal survives even
      // when the OAuth round-trip never completes (28d of data showed 5 OAuth
      // clicks → 0 plan_intents rows during the chunked-cookie OAuth bug).
      // If OAuth completes, auth-provider writes a second row with
      // signup_outcome='completed_*' — analysts dedupe on outcome.
      void persistPlanIntent({
        typed_goal: typedGoal,
        source_surface: sourceSurface,
        signup_outcome: 'unknown',
        page_path: effectivePagePath(),
      })
    }
    sessionStorage.setItem('plan_signup_provider', provider)

    // Phase 9 S2: client-side OAuth init (reliable PKCE — see lib/auth/oauth-client.ts).
    void signInWithOAuthClient(provider === 'google' ? 'google' : 'linkedin_oidc', nextUrl())
  }

  // Google now goes through GIS (signInWithIdToken) — no Supabase redirect — so
  // this runs the SAME intent-stash/analytics handleOAuth did, minus the redirect
  // (GoogleSignInButton creates the session). The auth-provider's anon→known
  // transition then persists the typed goal with completed_google on /plan, exactly
  // as before (pending intent is read from sessionStorage on the next page).
  function beforeGoogleSignIn() {
    analytics.planSignupModalOAuthClicked({ provider: 'google' })
    if (typedGoal.trim()) {
      stashPendingIntent(typedGoal, sourceSurface, effectivePagePath())
      void persistPlanIntent({
        typed_goal: typedGoal,
        source_surface: sourceSurface,
        signup_outcome: 'unknown',
        page_path: effectivePagePath(),
      })
    }
    sessionStorage.setItem('plan_signup_provider', 'google')
  }

  function handleSkip() {
    analytics.planSignupModalSkipped({ typed_goal_char_count: typedGoal.length })
    if (typedGoal.trim()) {
      void persistPlanIntent({
        typed_goal: typedGoal,
        source_surface: sourceSurface,
        signup_outcome: 'skipped',
        page_path: effectivePagePath(),
      })
    }
    onAfterSkip?.()
    onClose()
    // When invoked from the /plan ProjectPlanner the parent continues the
    // submit flow in onAfterSkip — no navigation needed. When invoked from
    // a CTA popup (homepage hero, etc.) we still send the user to /plan
    // with their typed goal pre-filled.
    if (redirectOnSkip) router.push(nextUrl())
  }

  // Phase 11 (2026-06-21): "Continue with email" → the full signup form, with
  // the typed goal preserved (stash + keepalive persist survive the navigation).
  function handleEmail() {
    analytics.signupMethodSelected('email', 'plan_signup_modal')
    if (typedGoal.trim()) {
      stashPendingIntent(typedGoal, sourceSurface, effectivePagePath())
      void persistPlanIntent({
        typed_goal: typedGoal,
        source_surface: sourceSurface,
        signup_outcome: 'unknown',
        page_path: effectivePagePath(),
      })
    }
    router.push(`/signup?next=${encodeURIComponent(nextUrl())}`)
  }

  // Phase 11: "Continue as guest" → a REAL anonymous account (saves their stack),
  // not the old no-op skip. Persist the goal (keepalive) before the session swap.
  function handleGuest() {
    analytics.signupMethodSelected('guest', 'plan_signup_modal')
    if (typedGoal.trim()) {
      void persistPlanIntent({
        typed_goal: typedGoal,
        source_surface: sourceSurface,
        signup_outcome: 'skipped',
        page_path: effectivePagePath(),
      })
    }
    void continueAsGuest(nextUrl())
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
            It&apos;s <span className="text-emerald-300 font-medium">free</span> and takes 5 seconds. We&apos;ll save your stack to your dashboard so you can revisit, compare, and share it anytime.
          </p>
        </div>

        <div className="mt-6 space-y-2.5">
          <GoogleSignInButton next={nextUrl()} beforeSession={beforeGoogleSignIn} />
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
          <button
            type="button"
            onClick={handleEmail}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 px-4 py-3 text-sm font-semibold text-white transition-colors"
          >
            <Mail className="h-4 w-4" aria-hidden />
            Continue with email
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleGuest}
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Continue as guest
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Skip for now
          </button>
        </div>

        <p className="mt-4 text-center text-[10px] text-zinc-600">
          We&apos;ll never post on your behalf or email you without permission.
        </p>
      </div>
    </div>
  )
}
