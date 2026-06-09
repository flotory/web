<script setup lang="ts">
import { Locate, MapPin, Navigation, Search } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import CustomerScreen from '@/components/customer/CustomerScreen.vue'
import DiscoverCategoryPills, { type DiscoverCategoryFilter } from '@/components/customer/DiscoverCategoryPills.vue'
import DiscoverVenueCard from '@/components/customer/DiscoverVenueCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import { useCustomerLocation } from '@/composables/useCustomerLocation'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { hasVenueCoordinates, sortVenuesByDistance } from '@/lib/distance'
import type { Customer, Venue } from '@/types'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const search = ref('')
const categoryFilter = ref<DiscoverCategoryFilter>('all')
const venues = ref<Venue[]>([])
const cardsByVenueId = ref<Record<number, Customer>>({})

const { status: locationStatus, coords, hasLocation, refreshLocation, requestLocation } = useCustomerLocation({
  autoRequest: true,
})

const KNOWN_CATEGORIES = new Set(['cafe', 'restaurant', 'bar', 'bakery'])

function matchesCategory(venue: Venue, filter: DiscoverCategoryFilter): boolean {
  const category = (venue.category ?? '').toLowerCase()
  switch (filter) {
    case 'all':
      return true
    case 'coffee':
      return category === 'cafe'
    case 'food':
      return category === 'restaurant' || category === 'bar'
    case 'desserts':
      return category === 'bakery'
    case 'more':
      return !category || !KNOWN_CATEGORIES.has(category)
    default:
      return true
  }
}

const locatedVenueCount = computed(() => venues.value.filter(hasVenueCoordinates).length)

const filteredVenues = computed(() => {
  const query = search.value.trim().toLowerCase()
  const matches = venues.value.filter((venue) => {
    if (!matchesCategory(venue, categoryFilter.value)) return false
    if (!query) return true
    const haystack = [venue.name, venue.category, venue.slug, venue.address].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(query)
  })

  return sortVenuesByDistance(matches, coords.value)
})

function openVenue(venue: Venue) {
  const joined = (venue.joined_count ?? 0) > 0
  const card = cardsByVenueId.value[venue.id]
  if (joined && card) {
    router.push({
      name: 'customer-card',
      params: { cardId: String(card.id) },
      query: { venue_id: String(venue.id) },
    })
    return
  }
  router.push(`/v/${venue.slug}`)
}

async function loadVenues() {
  loading.value = true
  error.value = ''

  try {
    const [discoverResponse, cardsResponse] = await Promise.all([
      api<{ venues: Venue[] }>('/venues/discover'),
      api<{ cards: Customer[] }>('/customer/cards'),
    ])

    venues.value = discoverResponse.venues
    cardsByVenueId.value = Object.fromEntries(cardsResponse.cards.map((card) => [card.venue_id, card]))
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load venues. Please try again.')
  } finally {
    loading.value = false
  }
}

onMounted(loadVenues)
</script>

<template>
  <AppShell>
    <CustomerScreen>
      <div class="mx-auto w-full max-w-md pb-4">
        <h1 class="text-[34px] font-extrabold tracking-tight text-ink">Discover venues</h1>
        <p class="mt-1 text-sm text-ink-muted">Find places to collect stamps and unlock rewards.</p>

        <div
          v-if="locationStatus === 'loading'"
          class="mt-3.5 flex items-center gap-2 rounded-2xl bg-surface-muted px-3.5 py-3 text-sm text-ink-muted"
        >
          <Locate class="size-[18px] shrink-0" />
          Finding venues near you…
        </div>

        <button
          v-else-if="hasLocation"
          type="button"
          class="mt-3.5 flex w-full items-center gap-2 rounded-2xl border border-accent-border/40 bg-accent-soft px-3.5 py-3 text-left text-sm font-semibold text-primary-soft transition hover:opacity-90"
          @click="refreshLocation"
        >
          <Navigation class="size-[18px] shrink-0" />
          <span class="flex-1">Sorted by distance from you</span>
          <span class="text-xs font-bold">Refresh</span>
        </button>

        <button
          v-else-if="locationStatus === 'denied'"
          type="button"
          class="mt-3.5 flex w-full items-center gap-2 rounded-2xl bg-surface-muted px-3.5 py-3 text-left text-sm text-ink-muted"
          @click="requestLocation"
        >
          <MapPin class="size-[18px] shrink-0" />
          Enable location to sort by distance
        </button>

        <label class="relative mt-3.5 block">
          <Search class="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-soft" />
          <input
            v-model="search"
            type="search"
            placeholder="Search venues"
            class="w-full rounded-2xl border border-border bg-surface py-3 pl-10 pr-4 text-[15px] text-ink outline-none placeholder:text-ink-soft focus:border-accent-border"
          >
        </label>

        <div class="mt-3.5">
          <DiscoverCategoryPills v-model="categoryFilter" />
        </div>

        <p
          v-if="hasLocation && locatedVenueCount === 0"
          class="mt-3 rounded-2xl bg-surface-muted px-3.5 py-3 text-sm text-ink-muted"
        >
          No venues with map coordinates yet — showing all venues alphabetically.
        </p>

        <div v-if="loading" class="mt-8">
          <EmptyState compact title="Loading venues…" />
        </div>

        <ErrorState
          v-else-if="error"
          class="mt-8"
          :message="error"
          @retry="loadVenues"
        />

        <EmptyState
          v-else-if="!filteredVenues.length"
          class="mt-8"
          :icon="Search"
          title="No matching venues"
          description="Try another search or category."
        />

        <ul
          v-else
          class="mt-5 space-y-3"
        >
          <li
            v-for="venue in filteredVenues"
            :key="venue.id"
          >
            <DiscoverVenueCard
              :venue="venue"
              :card="cardsByVenueId[venue.id]"
              :distance-label="venue.distanceLabel"
              @press="openVenue(venue)"
            />
          </li>
        </ul>
      </div>
    </CustomerScreen>
  </AppShell>
</template>
