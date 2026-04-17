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
      analytics.identify(user.id, {
        email: user.email,
        plan: 'free',
      })
      analytics.registerSuperProperties({
        user_plan: 'free',
        is_admin: profile?.is_admin ?? false,
      })
      analytics.setPlanGroup('free')
    } else {
      analytics.reset()
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
