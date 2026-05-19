'use client'

import { createContext, useContext, useEffect } from 'react'
import { analytics } from '@/lib/analytics'

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
  useEffect(() => {
    if (user?.id) {
      // Phase 8.g.1 — with project-level Identity Merge set to "Simplified"
      // in Mixpanel, identify() automatically merges the current anon
      // distinct_id into the user_id profile. One human = one profile.
      analytics.identify(user.id, {
        email: user.email,
        plan: 'free',
      })
      analytics.registerSuperProperties({
        user_plan: 'free',
        is_admin: profile?.is_admin ?? false,
        auth_state: 'known', // flips every subsequent event to known-user
      })
      analytics.setPlanGroup('free')
    } else {
      analytics.reset()
      // After reset, re-register auth_state so anon events still carry it.
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
