'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { analytics } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { registerAnonSuperProps } from './mixpanel-provider'
import { linkPlanIntentsToUser, readPendingIntent, clearPendingIntent, persistPlanIntent } from '@/lib/cta/persist-intent'

type User = {
  id: string
  email: string
} | null

type Profile = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
} | null

type AuthContextType = {
  user: User
  profile: Profile
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null })

export function AuthProvider({
  user,
  profile,
  children,
}: {
  user: User
  profile: Profile
  children: React.ReactNode
}) {
  // Phase 8.g.1 fix (2026-05-20) — previously this effect called
  // analytics.reset() on EVERY render where user was null, including the
  // first anonymous mount. Two consequences:
  //   1. mixpanel.reset() regenerates distinct_id every page navigation →
  //      every nav = new "user" in Mixpanel, identity merge can't bridge.
  //   2. reset() also clears every super-property registered in
  //      MixpanelProvider.loaded (device_type, session_n, viewport, env,
  //      app_version). Re-registering only auth_state leaves the rest gone.
  // Fix: only call reset() on a known→anon transition (real logout).
  const prevUserIdRef = useRef<string | null>(null)
  const router = useRouter()

  // OAuth return-path recovery. signInWithOAuthClient stashes `oauth_return_to`
  // before the provider round-trip. If Supabase honors our /auth/callback
  // (origin is in its redirect allowlist), the user already lands on that path
  // and this is a no-op. If Supabase instead falls back to the Site URL
  // (homepage) — the case on localhost / preview origins that aren't
  // allowlisted — we recover the path here once the session lands client-side.
  // Tight guard: only ever acts when an OAuth was just initiated (key present),
  // and consumes the key on the first auth event so it can't cause stray nav.
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) return
      let returnTo: string | null = null
      try { returnTo = sessionStorage.getItem('oauth_return_to') } catch { /* private mode */ }
      if (!returnTo) return
      try { sessionStorage.removeItem('oauth_return_to') } catch { /* ignore */ }
      if (returnTo.startsWith('/') && !returnTo.startsWith('//') && returnTo !== window.location.pathname) {
        router.replace(returnTo)
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    const prevUserId = prevUserIdRef.current
    if (user?.id) {
      // Project-level Identity Merge ("Simplified" in Mixpanel UI) makes
      // identify() automatically merge the current anon distinct_id into
      // the user_id profile. One human = one profile.
      analytics.identify(user.id, {
        email: user.email,
        plan: 'free',
      })
      analytics.registerSuperProperties({
        user_plan: 'free',
        is_admin: profile?.is_admin ?? false,
        auth_state: 'known',
      })
      analytics.setPlanGroup('free')

      // Phase 9 — anon→known transition. Run once per session per user:
      //   1. Restore any "pending intent" stashed before OAuth round-trip
      //      (modal Skip vs OAuth click stashes typed_goal in sessionStorage),
      //      POST it to /api/plan/intent so the row carries the new user_id.
      //   2. Reconcile every other anon plan_intents row for this distinct_id
      //      to the now-known user_id via /api/plan/intent/link.
      // Both are fire-and-forget. Only run on the transition itself (not on
      // every render where user.id is still set), guarded by prevUserId check.
      const wasAnonToKnown = !prevUserId
      if (wasAnonToKnown) {
        const pending = readPendingIntent()
        if (pending) {
          const provider = (sessionStorage.getItem('plan_signup_provider') as 'google' | 'linkedin' | null) ?? 'google'
          analytics.planSignupModalCompleted({ provider, was_anon_to_known: true })
          void persistPlanIntent({
            typed_goal: pending.typed_goal,
            source_surface: pending.source_surface,
            signup_outcome: provider === 'linkedin' ? 'completed_linkedin' : 'completed_google',
            // CRITICAL: pass the ORIGINAL CTA-click page (stashed before the
            // OAuth round-trip). Without this, the API route would fall back
            // to the Referer header which now reads /auth/callback or /plan.
            page_path: pending.page_path,
          }).finally(() => {
            clearPendingIntent()
            sessionStorage.removeItem('plan_signup_provider')
          })
        }
        void linkPlanIntentsToUser()
      }

      prevUserIdRef.current = user.id
    } else if (prevUserId) {
      // Real logout: was known, now anon. Reset clears the identity AND
      // every super-prop. MixpanelProvider.loaded() only fires once per SDK
      // init, so we restore the full static set via the shared helper.
      analytics.reset()
      registerAnonSuperProps()
      prevUserIdRef.current = null
    } else {
      // First mount as anonymous user: do NOT reset (would wipe distinct_id
      // and super-props set in MixpanelProvider.loaded). Just register the
      // anon auth_state flag.
      analytics.registerSuperProperties({ auth_state: 'anon' })
    }
  }, [user?.id, user?.email, profile?.is_admin])

  return (
    <AuthContext.Provider value={{ user, profile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
