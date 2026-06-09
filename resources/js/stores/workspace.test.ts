import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Venue } from '@/types'

import { useWorkspaceStore } from './workspace'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

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

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStore.clear()
  })

  it('defaults effectiveVenueId to the first active venue when filter is unset', () => {
    const workspace = useWorkspaceStore()
    workspace.venues = [venue(2, 'Harbor Coffee'), venue(1, 'Demo Cafe')]

    workspace.ensureVenueFilter()

    expect(workspace.effectiveVenueId).toBe(2)
    expect(workspace.filterVenueId).toBe(2)
  })

  it('reapplies a stored venue filter when bootstrap returns early', async () => {
    const workspace = useWorkspaceStore()
    workspace.loaded = true
    workspace.venues = [venue(1, 'Demo Cafe'), venue(2, 'Harbor Coffee')]
    sessionStorage.setItem('loyalty_venue_filter', '2')

    await workspace.bootstrap()

    expect(workspace.filterVenueId).toBe(2)
    expect(workspace.effectiveVenueId).toBe(2)
  })
})
