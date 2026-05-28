import { defineStore } from 'pinia'

import { api } from '@/lib/api'
import type { User, UserRole } from '@/types'

interface AuthResponse {
  user: User
  token: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token'),
    user: null as User | null,
    booted: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token),
  },
  actions: {
    async login(payload: { email: string; password: string }) {
      const response = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { ...payload, device_name: 'browser' },
      })

      this.setSession(response.user, response.token)
    },
    async register(payload: {
      name: string
      email: string
      password: string
      password_confirmation: string
      role?: Extract<UserRole, 'customer'>
    }) {
      const response = await api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { ...payload, device_name: 'browser', role: 'customer' },
      })

      this.setSession(response.user, response.token)
    },
    async fetchUser() {
      if (!this.token) {
        this.booted = true
        return
      }

      try {
        const response = await api<{ user: User }>('/auth/me')
        this.user = response.user
      } catch {
        this.clearSession()
      } finally {
        this.booted = true
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
      this.user = user
      this.token = token
      this.booted = true
      localStorage.setItem('auth_token', token)
    },
    clearSession() {
      this.user = null
      this.token = null
      this.booted = true
      localStorage.removeItem('auth_token')
    },
  },
})
