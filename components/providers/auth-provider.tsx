'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { analytics } from '@/lib/analytics'
import { registerAnonSuperProps } from './mixpanel-provider'

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
