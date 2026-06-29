import { defineStore } from 'pinia'

import { api } from '@/lib/api'
import type { User } from '@/types'

interface AuthResponse {
  user: User
  token: string
}

interface MeResponse {
  user: User
  capabilities?: {
    may_create_venue?: boolean
  }
}

function normalizeUser(user: User & { is_admin?: boolean | 0 | 1 }): User {
  return {
    ...user,
    is_admin: Boolean(user.is_admin),
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token'),
    user: null as User | null,
    mayCreateVenue: false,
    booted: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
    isAdmin: (state) => state.user?.is_admin === true,
  },
  actions: {
    async login(payload: { email: string; password: string }) {
      const response = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { ...payload, device_name: 'browser' },
      })

      if (!response?.user || !response?.token) {
        throw new Error(
          'Login response was invalid. Open http://localhost:8000 (not the Vite port :5173) when developing locally.',
        )
      }

      this.setSession(response.user, response.token)
      await this.refreshCapabilities()
    },
    async register(payload: {
      name: string
      email: string
      password: string
      password_confirmation: string
    }) {
      const response = await api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { ...payload, device_name: 'browser' },
      })

      this.setSession(response.user, response.token)
      await this.refreshCapabilities()
    },
    async fetchUser() {
      if (!this.token) {
        this.booted = true
        this.mayCreateVenue = false
        return
      }

      try {
        const response = await api<MeResponse>('/auth/me')
        this.user = normalizeUser(response.user)
        this.mayCreateVenue = response.capabilities?.may_create_venue === true
      } catch {
        this.clearSession()
      } finally {
        this.booted = true
      }
    },
    async refreshCapabilities() {
      if (!this.token) {
        this.mayCreateVenue = false
        return
      }

      try {
        const response = await api<MeResponse>('/auth/me')
        this.mayCreateVenue = response.capabilities?.may_create_venue === true
      } catch {
        this.mayCreateVenue = false
      }
    },
    async loginWithToken(token: string) {
      this.token = token
      this.booted = false
      localStorage.setItem('auth_token', token)
      await this.fetchUser()

      if (!this.user) {
        throw new Error('OAuth session could not be initialized')
      }
    },
    async logout() {
      if (this.token) {
        await api<void>('/auth/logout', { method: 'POST' }).catch(() => undefined)
      }

      this.clearSession()
    },
    setSession(user: User, token: string) {
      this.user = normalizeUser(user)
      this.token = token
      this.booted = true
      localStorage.setItem('auth_token', token)
    },
    clearSession() {
      this.user = null
      this.token = null
      this.mayCreateVenue = false
      this.booted = true
      localStorage.removeItem('auth_token')
    },
  },
})
