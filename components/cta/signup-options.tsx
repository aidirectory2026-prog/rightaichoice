'use client'

/**
 * Phase 12 Bug-1 — shared "save your stack" auth block.
 *
 * The Google / LinkedIn / Email / Guest / Skip options, extracted so the stepped
 * wizard's signup screen (`stack-wizard.tsx`) fires the EXACT same tracking +
 * plan-intent persistence the legacy `PlanSignupModal` does. The chrome (modal
 * vs. wizard screen) lives in the caller; this is just the option list + the
 * behaviour behind each path.
 *
 * Tracking parity (vs PlanSignupModal):
 *   - LinkedIn / Google  → planSignupModalOAuthClicked + stash + keepalive persist
 *   - Email              → signupMethodSelected('email') + stash + keepalive persist
 *   - Guest              → signupMethodSelected('guest') + keepalive persist(skipped)
 *   - Skip               → planSignupModalSkipped + persist(skipped) + onSkip()
 * `plan_signup_modal_shown` is fired by the CALLER when the gate becomes visible.
 */

import { useRouter } from 'next/navigation'
import { ArrowRight, Mail } from 'lucide-react'
import { signInWithOAuthClient } from '@/lib/auth/oauth-client'
import { continueAsGuest } from '@/lib/auth/guest-client'
import { GoogleSignInButton } from '@/components/auth/google-signin-button'
import { analytics } from '@/lib/analytics'
import { persistPlanIntent, stashPendingIntent } from '@/lib/cta/persist-intent'

type Surface = 'sticky_bar' | 'inline_card' | 'navbar' | 'homepage' | 'plan_page'

type Props = {
  typedGoal: string
  sourceSurface: Surface
  /** Destination after auth (e.g. /plan?q=…&source=…&ready=1). Used by every
   *  path so the user lands on the results with their goal + profile ready. */
  nextUrl: string
  /** Page the user started the funnel on → plan_intents.source_path. */
  originalPagePath?: string
  /** "Skip for now" — analytics + persist happen here; the caller navigates
   *  to the results (the wizard already has the goal + profile). */
  onSkip: () => void
}

export function SignupOptions({ typedGoal, sourceSurface, nextUrl, originalPagePath, onSkip }: Props) {
  const router = useRouter()

  function effectivePagePath(): string {
    if (originalPagePath) return originalPagePath
    if (typeof window === 'undefined') return ''
    return window.location.pathname || ''
  }

  function handleOAuth(provider: 'google' | 'linkedin') {
    analytics.planSignupModalOAuthClicked({ provider })
    if (typedGoal.trim()) {
      stashPendingIntent(typedGoal, sourceSurface, effectivePagePath())
      void persistPlanIntent({
        typed_goal: typedGoal,
        source_surface: sourceSurface,
        signup_outcome: 'unknown',
        page_path: effectivePagePath(),
      })
    }
    sessionStorage.setItem('plan_signup_provider', provider)
    void signInWithOAuthClient(provider === 'google' ? 'google' : 'linkedin_oidc', nextUrl)
  }

  // Google runs through GIS (no Supabase redirect): same stash/analytics minus
  // the redirect — GoogleSignInButton creates the session, then auth-provider
  // persists the goal with completed_google on the next page.
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
    router.push(`/signup?next=${encodeURIComponent(nextUrl)}`)
  }

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
    void continueAsGuest(nextUrl)
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
    onSkip()
  }

  return (
    <div className="w-full">
      <div className="space-y-2.5">
        <GoogleSignInButton next={nextUrl} beforeSession={beforeGoogleSignIn} />
        <button
          type="button"
          onClick={() => handleOAuth('linkedin')}
          className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-[#0A66C2] hover:bg-[#0958A8] px-4 py-3 text-sm font-semibold text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
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
          Skip — just show my stack
        </button>
      </div>

      <p className="mt-4 text-center text-[10px] text-zinc-600">
        We&apos;ll never post on your behalf or email you without permission.
      </p>
    </div>
  )
}
