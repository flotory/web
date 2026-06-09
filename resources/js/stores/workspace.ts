import { defineStore } from 'pinia'

import { api } from '@/lib/api'
import { isStaffOnlyMember, isVenueOwner, isVenueStaff } from '@/lib/venueRoles'
import type { Venue } from '@/types'

const FILTER_KEY = 'loyalty_venue_filter'

function firstActiveVenueId(venues: Venue[]): number | null {
  const active = venues.filter((venue) => !venue.archived)

  return active[0]?.id ?? null
}

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    venues: [] as Venue[],
    filterVenueId: null as number | null,
    loaded: false,
  }),
  getters: {
    activeVenues: (state) => state.venues.filter((venue) => !venue.archived),
    hasMembership(state): boolean {
      return state.venues.some((venue) => !venue.archived)
    },
    filteredVenue(state): Venue | null {
      const id = state.filterVenueId ?? firstActiveVenueId(state.venues)

      if (id === null) {
        return null
      }

      return state.venues.find((venue) => !venue.archived && venue.id === id) ?? null
    },
    /** Venue id for pages that need a single venue (rewards, team, etc.). */
    effectiveVenueId(state): number | null {
      return state.filterVenueId ?? firstActiveVenueId(state.venues)
    },
    effectiveVenue(state): Venue | null {
      const id = state.filterVenueId ?? firstActiveVenueId(state.venues)

      if (id === null) {
        return null
      }

      return state.venues.find((venue) => !venue.archived && venue.id === id) ?? null
    },
    isStaffOnlyMember(): boolean {
      return isStaffOnlyMember(this.activeVenues)
    },
    isStaffAtEffectiveVenue(): boolean {
      return isVenueStaff(this.effectiveVenue)
    },
    isOwnerAtEffectiveVenue(): boolean {
      return isVenueOwner(this.effectiveVenue)
    },
  },
  actions: {
    ensureVenueFilter() {
      const active = this.activeVenues
      const stored = sessionStorage.getItem(FILTER_KEY)

      if (stored) {
        const id = Number(stored)
        if (active.some((venue) => venue.id === id)) {
          this.filterVenueId = id
          return
        }
      }

      if (this.filterVenueId !== null && active.some((venue) => venue.id === this.filterVenueId)) {
        sessionStorage.setItem(FILTER_KEY, String(this.filterVenueId))
        return
      }

      const fallbackId = firstActiveVenueId(this.venues)
      this.filterVenueId = fallbackId

      if (fallbackId !== null) {
        sessionStorage.setItem(FILTER_KEY, String(fallbackId))
      } else {
        sessionStorage.removeItem(FILTER_KEY)
      }
    },
    async bootstrap(force = false) {
      if (!this.loaded || force) {
        const response = await api<{ venues: Venue[] }>('/venues')
        this.venues = response.venues
        this.loaded = true
      }

      this.ensureVenueFilter()
    },
    setFilter(venueId: number | null) {
      this.filterVenueId = venueId
      if (venueId === null) {
        sessionStorage.removeItem(FILTER_KEY)
        this.ensureVenueFilter()
        return
      }

      sessionStorage.setItem(FILTER_KEY, String(venueId))
    },
  },
})
