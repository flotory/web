import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Venue } from '@/types'

import { useAuthStore } from './auth'
import { useWorkspaceStore } from './workspace'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  isUnauthenticatedError: (error: unknown) =>
    typeof error === 'object'
    && error !== null
    && 'status' in error
    && (error as { status: number }).status === 401,
}))

import { api } from '@/lib/api'

function venue(id: number, name: string): Venue {
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    archived: false,
    status: 'published',
    membership_role: 'owner',
  } as Venue
}

const sessionStore = new Map<string, string>()
const localStore = new Map<string, string>()

vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => sessionStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    sessionStore.set(key, value)
  },
  removeItem: (key: string) => {
    sessionStore.delete(key)
  },
  clear: () => {
    sessionStore.clear()
  },
})

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

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore.clear()
    localStore.clear()
    vi.mocked(api).mockReset()
  })

  it('defaults effectiveVenueId to the first active venue when filter is unset', () => {
    const workspace = useWorkspaceStore()
    workspace.venues = [venue(2, 'Harbor Coffee'), venue(1, 'Demo Cafe')]

    workspace.ensureVenueFilter()

    expect(workspace.effectiveVenueId).toBe(2)
    expect(workspace.filterVenueId).toBe(2)
  })

  it('reapplies a stored venue filter when bootstrap returns early', async () => {
    const auth = useAuthStore()
    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')

    const workspace = useWorkspaceStore()
    workspace.loaded = true
    workspace.venues = [venue(1, 'Demo Cafe'), venue(2, 'Harbor Coffee')]
    sessionStorage.setItem('loyalty_venue_filter', '2')

    await workspace.bootstrap()

    expect(workspace.filterVenueId).toBe(2)
    expect(workspace.effectiveVenueId).toBe(2)
  })

  it('exposes filtered and effective venues while ignoring archived rows', () => {
    const workspace = useWorkspaceStore()
    const active = venue(1, 'Demo Cafe')
    const archived = { ...venue(2, 'Old Spot'), archived: true } as Venue

    workspace.venues = [active, archived]
    workspace.setFilter(1)

    expect(workspace.activeVenues).toEqual([active])
    expect(workspace.filteredVenue).toEqual(active)
    expect(workspace.effectiveVenue).toEqual(active)
    expect(workspace.isOwnerAtEffectiveVenue).toBe(true)
  })

  it('clears the stored filter when setFilter receives null', () => {
    const workspace = useWorkspaceStore()
    workspace.venues = [venue(1, 'Demo Cafe')]
    workspace.setFilter(1)

    workspace.setFilter(null)

    expect(workspace.filterVenueId).toBe(1)
    expect(sessionStorage.getItem('loyalty_venue_filter')).toBe('1')
  })

  it('skips venue fetch when there is no auth token', async () => {
    const workspace = useWorkspaceStore()

    await workspace.bootstrap()

    expect(api).not.toHaveBeenCalled()
  })

  it('skips venue fetch while logging out', async () => {
    const auth = useAuthStore()
    auth.setSession({ id: 1, name: 'Owner', email: 'owner@example.com', is_admin: false } as never, 'token')
    auth.loggingOut = true

    const workspace = useWorkspaceStore()
    await workspace.bootstrap()

    expect(api).not.toHaveBeenCalled()
  })
})
