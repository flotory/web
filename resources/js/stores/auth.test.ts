import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ApiError } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

const localStore = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (key: string) => localStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    localStore.set(key, value)
  },
  removeItem: (key: string) => {
    localStore.delete(key)
  },
  clear: () => {
    localStore.clear()
  },
})

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  abortActiveApiRequests: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message)
    }
  },
}))

import { abortActiveApiRequests, api } from '@/lib/api'

function ownerUser() {
  return {
    id: 1,
    name: 'Owner',
    email: 'owner@example.com',
    is_admin: false,
    locale: 'en',
    currency: 'USD',
  }
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStore.clear()
    setActivePinia(createPinia())
    vi.mocked(api).mockReset()
    vi.mocked(abortActiveApiRequests).mockReset()
    vi.mocked(api).mockResolvedValue(undefined)
  })

  it('isSessionCurrent reflects epoch, token, and loggingOut', () => {
    const auth = useAuthStore()
    const epoch = auth.sessionEpoch

    auth.setSession(ownerUser() as never, 'token')

    expect(auth.isSessionCurrent(epoch)).toBe(true)

    auth.invalidateSessionWork()

    expect(auth.isSessionCurrent(epoch)).toBe(false)

    auth.setSession(ownerUser() as never, 'token')
    auth.loggingOut = true

    expect(auth.isSessionCurrent(auth.sessionEpoch)).toBe(false)
  })

  it('logout clears session, bumps epoch, aborts requests, and revokes token', () => {
    const auth = useAuthStore()
    auth.setSession(ownerUser() as never, 'session-token')
    const epochBefore = auth.sessionEpoch

    auth.logout()

    expect(auth.loggingOut).toBe(true)
    expect(auth.sessionEpoch).toBe(epochBefore + 1)
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(localStore.get('auth_token')).toBeUndefined()
    expect(abortActiveApiRequests).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      authToken: 'session-token',
      bindToSession: false,
    })
  })

  it('logout without token still invalidates in-flight session work', () => {
    const auth = useAuthStore()
    const epochBefore = auth.sessionEpoch

    auth.logout()

    expect(auth.sessionEpoch).toBe(epochBefore + 1)
    expect(abortActiveApiRequests).toHaveBeenCalledTimes(1)
    expect(api).not.toHaveBeenCalled()
  })

  it('finishLogout clears loggingOut flag', () => {
    const auth = useAuthStore()
    auth.logout()

    auth.finishLogout()

    expect(auth.loggingOut).toBe(false)
  })

  it('fetchUser clears session when /auth/me returns 401', async () => {
    const auth = useAuthStore()
    auth.token = 'stale-token'
    localStore.set('auth_token', 'stale-token')

    vi.mocked(api).mockRejectedValue(new ApiError('Unauthenticated.', 401))

    await auth.fetchUser()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.booted).toBe(true)
    expect(localStore.get('auth_token')).toBeUndefined()
  })

  it('fetchUser is a no-op without token', async () => {
    const auth = useAuthStore()

    await auth.fetchUser()

    expect(api).not.toHaveBeenCalled()
    expect(auth.booted).toBe(true)
    expect(auth.mayCreateVenue).toBe(false)
  })

  it('loginWithToken loads the user for a valid oauth token', async () => {
    const auth = useAuthStore()

    vi.mocked(api).mockResolvedValue({
      user: ownerUser(),
      capabilities: { may_create_venue: true },
    })

    await auth.loginWithToken('oauth-token')

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.email).toBe('owner@example.com')
    expect(auth.mayCreateVenue).toBe(true)
    expect(localStore.get('auth_token')).toBe('oauth-token')
  })

  it('loginWithToken throws when session work is invalidated during fetchUser', async () => {
    const auth = useAuthStore()

    vi.mocked(api).mockImplementation(async () => {
      auth.invalidateSessionWork()
      return {
        user: ownerUser(),
        capabilities: { may_create_venue: false },
      }
    })

    await expect(auth.loginWithToken('oauth-token')).rejects.toThrow('Login cancelled')
    expect(auth.isAuthenticated).toBe(false)
  })

  it('loginWithToken throws when fetchUser leaves no user', async () => {
    const auth = useAuthStore()

    vi.mocked(api).mockRejectedValue(new ApiError('Unauthenticated.', 401))

    await expect(auth.loginWithToken('oauth-token')).rejects.toThrow('OAuth session could not be initialized')
    expect(auth.isAuthenticated).toBe(false)
  })

  it('login throws when session work is invalidated before credentials resolve', async () => {
    const auth = useAuthStore()

    vi.mocked(api).mockImplementation(async () => {
      auth.invalidateSessionWork()
      return {
        user: ownerUser(),
        token: 'new-token',
      }
    })

    await expect(auth.login({
      email: 'owner@example.com',
      password: 'password',
    })).rejects.toThrow('Login cancelled')

    expect(auth.isAuthenticated).toBe(false)
  })

  it('login stores session when credentials resolve before invalidation', async () => {
    const auth = useAuthStore()

    vi.mocked(api)
      .mockResolvedValueOnce({
        user: ownerUser(),
        token: 'new-token',
      })
      .mockResolvedValueOnce({
        user: ownerUser(),
        capabilities: { may_create_venue: false },
      })

    await auth.login({
      email: 'owner@example.com',
      password: 'password',
    })

    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user?.email).toBe('owner@example.com')
    expect(localStore.get('auth_token')).toBe('new-token')
  })
})
