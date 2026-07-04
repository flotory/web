import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { ApiError } from '@/lib/api'
import { bootstrapWorkspaceOrSignOut } from '@/lib/sessionGuard'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

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

describe('bootstrapWorkspaceOrSignOut', () => {
  beforeEach(() => {
    localStore.clear()
    setActivePinia(createPinia())
  })

  it('returns true when workspace bootstrap succeeds', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    vi.spyOn(workspace, 'bootstrap').mockResolvedValue(undefined)

    await expect(bootstrapWorkspaceOrSignOut(auth, workspace)).resolves.toBe(true)
    expect(auth.isAuthenticated).toBe(true)
  })

  it('clears session and returns false on 401', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    vi.spyOn(workspace, 'bootstrap').mockRejectedValue(new ApiError('Unauthenticated.', 401))
    const reset = vi.spyOn(workspace, '$reset')

    await expect(bootstrapWorkspaceOrSignOut(auth, workspace)).resolves.toBe(false)
    expect(auth.isAuthenticated).toBe(false)
    expect(reset).toHaveBeenCalled()
  })

  it('rethrows non-auth bootstrap errors', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    vi.spyOn(workspace, 'bootstrap').mockRejectedValue(new ApiError('Server error', 500))

    await expect(bootstrapWorkspaceOrSignOut(auth, workspace)).rejects.toMatchObject({ status: 500 })
    expect(auth.isAuthenticated).toBe(true)
  })

  it('skips bootstrap while logging out', async () => {
    const auth = useAuthStore()
    const workspace = useWorkspaceStore()

    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    auth.loggingOut = true
    const bootstrap = vi.spyOn(workspace, 'bootstrap')

    await expect(bootstrapWorkspaceOrSignOut(auth, workspace)).resolves.toBe(true)
    expect(bootstrap).not.toHaveBeenCalled()
  })
})
