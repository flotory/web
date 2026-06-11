import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { apiRequest } from '../lib/api'
import { clearToken, getToken, saveToken } from '../lib/session'
import type { AuthResponse, MobileUser, UserRole, VenueMembership } from '../types/auth'

interface AuthContextValue {
  booting: boolean
  token: string | null
  user: MobileUser | null
  role: UserRole | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  signInWithToken: (sessionToken: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function deriveRole(venues: VenueMembership[]): UserRole {
  const hasOwner = venues.some((venue) => venue.membership_role === 'owner')
  if (hasOwner) return 'owner'
  return 'customer'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<MobileUser | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)

  async function hydrateSession(sessionToken: string) {
    const me = await apiRequest<{ user: MobileUser }>('/auth/me', { token: sessionToken })
    const venues = await apiRequest<{ venues: VenueMembership[] }>('/venues', { token: sessionToken })
      .catch(() => ({ venues: [] }))

    setUser(me.user)
    setRole(deriveRole(venues.venues))
  }

  useEffect(() => {
    async function boot() {
      try {
        const stored = await getToken()
        if (!stored) return
        await hydrateSession(stored)
        setToken(stored)
      } catch {
        await clearToken()
        setToken(null)
        setUser(null)
        setRole(null)
      } finally {
        setBooting(false)
      }
    }

    void boot()
  }, [])

  async function signIn(email: string, password: string) {
    const payload = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, device_name: 'flotory-mobile' },
    })

    try {
      await saveToken(payload.token)
      await hydrateSession(payload.token)
      setToken(payload.token)
    } catch (exception) {
      await clearToken()
      setToken(null)
      setUser(null)
      setRole(null)
      throw exception
    }
  }

  async function signInWithToken(sessionToken: string) {
    try {
      await saveToken(sessionToken)
      await hydrateSession(sessionToken)
      setToken(sessionToken)
    } catch (exception) {
      await clearToken()
      setToken(null)
      setUser(null)
      setRole(null)
      throw exception
    }
  }

  async function signUp(name: string, email: string, password: string) {
    const payload = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: {
        name,
        email,
        password,
        password_confirmation: password,
        device_name: 'flotory-mobile',
      },
    })

    try {
      await saveToken(payload.token)
      await hydrateSession(payload.token)
      setToken(payload.token)
    } catch (exception) {
      await clearToken()
      setToken(null)
      setUser(null)
      setRole(null)
      throw exception
    }
  }

  async function signOut() {
    if (token) {
      await apiRequest<void>('/auth/logout', { method: 'POST', token }).catch(() => undefined)
    }
    await clearToken()
    setToken(null)
    setUser(null)
    setRole(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({ booting, token, user, role, signIn, signUp, signInWithToken, signOut }),
    [booting, token, user, role],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

