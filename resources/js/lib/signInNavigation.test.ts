import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { BOOK_DEMO_PATH, OWNER_VENUE_SETUP_PATH } from '@/lib/venueRoles'
import {
  completeSignInNavigation,
  isLoginCancelledError,
  loginQueryWithoutOAuthToken,
  resolveOwnerPostAuthDestination,
} from '@/lib/signInNavigation'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

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
  isUnauthenticatedError: () => false,
  isAbortedRequest: () => false,
}))

function venue(id: number): Venue {
  return {
    id,
    name: `Venue ${id}`,
    slug: `venue-${id}`,
    archived: false,
    status: 'published',
    membership_role: 'owner',
  } as Venue
}

describe('signInNavigation', () => {
  beforeEach(() => {
    localStore.clear()
    setActivePinia(createPinia())
  })

  it('detects cancelled login errors', () => {
    expect(isLoginCancelledError(new Error('Login cancelled'))).toBe(true)
    expect(isLoginCancelledError(new Error('Other'))).toBe(false)
  })

  it('removes oauth_token from login query params', () => {
    expect(loginQueryWithoutOAuthToken({
      oauth_token: 'secret-token',
      redirect: '/dashboard',
      intent: 'owner',
    })).toEqual({
      redirect: '/dashboard',
      intent: 'owner',
    })
  })

  it('preserves unrelated login query params when stripping oauth_token', () => {
    expect(loginQueryWithoutOAuthToken({
      oauth_token: 'secret-token',
      error: 'google_auth_failed',
      email: 'owner@example.com',
    })).toEqual({
      error: 'google_auth_failed',
      email: 'owner@example.com',
    })
  })

  it('routes owners with membership to dashboard', () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    workspace.venues = [venue(1)]

    expect(resolveOwnerPostAuthDestination(auth, workspace)).toBe('/dashboard')
  })

  it('routes invited owners without a venue to onboarding', () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    auth.mayCreateVenue = true

    expect(resolveOwnerPostAuthDestination(auth, workspace)).toBe(OWNER_VENUE_SETUP_PATH)
  })

  it('routes owners without membership or invite capability to book demo', () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    auth.mayCreateVenue = false

    expect(resolveOwnerPostAuthDestination(auth, workspace)).toBe(BOOK_DEMO_PATH)
  })

  it('stops navigation when the session epoch changes during bootstrap', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()
    const router = { replace: vi.fn().mockResolvedValue(undefined) }

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    const sessionEpoch = auth.sessionEpoch

    vi.spyOn(workspace, 'bootstrap').mockImplementation(async () => {
      auth.invalidateSessionWork()
      auth.clearSession()
    })

    const completed = await completeSignInNavigation({
      auth,
      workspace,
      router: router as never,
      sessionEpoch,
      redirect: '/dashboard',
    })

    expect(completed).toBe(false)
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('navigates when the session remains active', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()
    const router = { replace: vi.fn().mockResolvedValue(undefined) }

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    workspace.venues = [venue(1)]
    vi.spyOn(workspace, 'bootstrap').mockResolvedValue(undefined)

    const completed = await completeSignInNavigation({
      auth,
      workspace,
      router: router as never,
      sessionEpoch: auth.sessionEpoch,
      redirect: '/dashboard',
    })

    expect(completed).toBe(true)
    expect(router.replace).toHaveBeenCalledWith('/dashboard')
  })

  it('navigates owner intent to onboarding when the user may create a venue', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()
    const router = { replace: vi.fn().mockResolvedValue(undefined) }

    auth.setSession({ id: 1, name: 'Owner', email: 'invited@example.com', is_admin: false } as never, 'token')
    auth.mayCreateVenue = true
    vi.spyOn(workspace, 'bootstrap').mockResolvedValue(undefined)

    const completed = await completeSignInNavigation({
      auth,
      workspace,
      router: router as never,
      sessionEpoch: auth.sessionEpoch,
      intent: 'owner',
    })

    expect(completed).toBe(true)
    expect(router.replace).toHaveBeenCalledWith('/onboarding')
  })

  it('navigates owner intent to book demo when the user cannot create a venue', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()
    const router = { replace: vi.fn().mockResolvedValue(undefined) }

    auth.setSession({ id: 1, name: 'Owner', email: 'prospect@example.com', is_admin: false } as never, 'token')
    auth.mayCreateVenue = false
    vi.spyOn(workspace, 'bootstrap').mockResolvedValue(undefined)

    const completed = await completeSignInNavigation({
      auth,
      workspace,
      router: router as never,
      sessionEpoch: auth.sessionEpoch,
      intent: 'owner',
    })

    expect(completed).toBe(true)
    expect(router.replace).toHaveBeenCalledWith(BOOK_DEMO_PATH)
  })

  it('navigates owner intent to dashboard when membership already exists', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()
    const router = { replace: vi.fn().mockResolvedValue(undefined) }

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    auth.mayCreateVenue = false
    workspace.venues = [venue(1)]
    vi.spyOn(workspace, 'bootstrap').mockResolvedValue(undefined)

    const completed = await completeSignInNavigation({
      auth,
      workspace,
      router: router as never,
      sessionEpoch: auth.sessionEpoch,
      intent: 'owner',
    })

    expect(completed).toBe(true)
    expect(router.replace).toHaveBeenCalledWith('/dashboard')
  })
})
