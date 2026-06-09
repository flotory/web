import { defineStore } from 'pinia'

import { api } from '@/lib/api'
import { isStaffOnlyMember, isVenueOwner, isVenueStaff } from '@/lib/venueRoles'
import type { Venue } from '@/types'

const FILTER_KEY = 'loyalty_venue_filter'

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
      if (state.filterVenueId === null) {
        return null
      }

      return state.venues.find((venue) => !venue.archived && venue.id === state.filterVenueId) ?? null
    },
    /** Venue id for pages that need a single venue (rewards, team, etc.). */
    effectiveVenueId(state): number | null {
      if (state.filterVenueId !== null) {
        return state.filterVenueId
      }

      const active = state.venues.filter((venue) => !venue.archived)

      return active.length === 1 ? active[0].id : null
    },
    effectiveVenue(state): Venue | null {
      const id = state.filterVenueId !== null
        ? state.filterVenueId
        : (() => {
            const active = state.venues.filter((venue) => !venue.archived)
            return active.length === 1 ? active[0].id : null
          })()

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
    async bootstrap(force = false) {
      if (this.loaded && !force) {
        return
      }

      const response = await api<{ venues: Venue[] }>('/venues')
      this.venues = response.venues

      const stored = sessionStorage.getItem(FILTER_KEY)
      const active = this.activeVenues
      if (stored) {
        const id = Number(stored)
        this.filterVenueId = active.some((venue) => venue.id === id) ? id : null
      }

      if (this.filterVenueId === null && active.length > 0) {
        this.filterVenueId = active[0].id
        sessionStorage.setItem(FILTER_KEY, String(active[0].id))
      }

      this.loaded = true
    },
    setFilter(venueId: number | null) {
      this.filterVenueId = venueId
      if (venueId === null) {
        sessionStorage.removeItem(FILTER_KEY)
        return
      }

      sessionStorage.setItem(FILTER_KEY, String(venueId))
    },
  },
})
