'use client'

import { createContext, useContext } from 'react'

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
  return (
    <AuthContext.Provider value={{ user, profile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
