import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { completeSignInNavigation, isLoginCancelledError, resolveOwnerPostAuthDestination } from '@/lib/signInNavigation'
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

  it('routes owners with membership to dashboard', () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    workspace.venues = [venue(1)]

    expect(resolveOwnerPostAuthDestination(auth, workspace)).toBe('/dashboard')
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
})
