'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { analytics } from '@/lib/analytics'
import { registerAnonSuperProps } from './mixpanel-provider'
import { linkPlanIntentsToUser, readPendingIntent, clearPendingIntent, persistPlanIntent } from '@/lib/cta/persist-intent'

type User = {
  id: string
  email: string
  is_anonymous: boolean
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
  initialUser = null,
  initialProfile = null,
  children,
}: {
  // Caching refactor (fable-5, 2026-06-16): auth is now resolved CLIENT-SIDE so
  // the root layout no longer reads cookies — that's what lets anonymous
  // content pages be statically cached/ISR'd at the edge. The server renders
  // the neutral (logged-out) shell; this provider confirms the real session on
  // mount and updates the nav. `initial*` props stay optional for any caller
  // that still wants to seed SSR state (none do today).
  initialUser?: User
  initialProfile?: Profile
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User>(initialUser)
  const [profile, setProfile] = useState<Profile>(initialProfile)

  // Resolve the real session on the client, and keep it in sync with
  // login/logout/token-refresh. Runs once; never throws into render.
  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function resolve(uid: string | null, email: string | null, isAnon: boolean) {
      if (!uid) {
        if (active) { setUser(null); setProfile(null) }
        return
      }
      if (active) setUser({ id: uid, email: email ?? '', is_anonymous: isAnon })
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, is_admin')
        .eq('id', uid)
        .single()
      if (active) setProfile((data as Profile) ?? null)
    }

    // BUG-23: cheap getSession() pre-check first. It reads the stored session
    // WITHOUT a network round-trip, so an anonymous visitor (the common case on
    // edge-cached pages) skips the getUser() call entirely. Only when a session
    // exists do we validate it against the auth server; if that validation
    // fails (a stale/un-refreshable token), clear the sb-* cookie locally so we
    // don't re-hit a dead token on every navigation.
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!session) {
          if (active) { setUser(null); setProfile(null) }
          return
        }
        const { data, error } = await supabase.auth.getUser()
        if (error || !data.user) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          if (active) { setUser(null); setProfile(null) }
          return
        }
        void resolve(data.user.id, data.user.email ?? null, data.user.is_anonymous ?? false)
      })
      .catch(() => { if (active) { setUser(null); setProfile(null) } })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void resolve(session?.user?.id ?? null, session?.user?.email ?? null, session?.user?.is_anonymous ?? false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

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
          analytics.planSignupModalCompleted({ provider, was_anon_to_known: true, source_surface: pending.source_surface })
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
