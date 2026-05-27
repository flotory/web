import { defineStore } from 'pinia'

import { api } from '@/lib/api'
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
  },
  actions: {
    async bootstrap(force = false) {
      if (this.loaded && !force) {
        return
      }

      const response = await api<{ venues: Venue[] }>('/venues')
      this.venues = response.venues

      const stored = sessionStorage.getItem(FILTER_KEY)
      if (stored === '' || stored === 'all') {
        this.filterVenueId = null
      } else if (stored) {
        const id = Number(stored)
        this.filterVenueId = this.activeVenues.some((venue) => venue.id === id) ? id : null
      }

      this.loaded = true
    },
    setFilter(venueId: number | null) {
      this.filterVenueId = venueId
      sessionStorage.setItem(FILTER_KEY, venueId === null ? 'all' : String(venueId))
    },
  },
})
