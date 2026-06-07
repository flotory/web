<script setup lang="ts">
import { Search, Store } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { joinVenueBySlug } from '@/lib/onboarding'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import type { Customer, Venue } from '@/types'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const search = ref('')
const venues = ref<Venue[]>([])
const cardsByVenueId = ref<Record<number, Customer>>({})
const joiningSlug = ref<string | null>(null)
const joinError = ref('')

const filteredVenues = computed(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) {
    return venues.value
  }

  return venues.value.filter((venue) => {
    const name = venue.name.toLowerCase()
    const address = venue.address?.toLowerCase() ?? ''
    return name.includes(query) || address.includes(query)
  })
})

function isJoined(venue: Venue): boolean {
  return (venue.joined_count ?? 0) > 0
}

function stampsFor(venueId: number): number | null {
  return cardsByVenueId.value[venueId]?.stamps ?? null
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
    cardsByVenueId.value = Object.fromEntries(
      cardsResponse.cards.map((card) => [card.venue_id, card]),
    )
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load venues. Please try again.')
  } finally {
    loading.value = false
  }
}

async function joinVenue(venue: Venue) {
  joiningSlug.value = venue.slug
  joinError.value = ''

  try {
    const response = await joinVenueBySlug(venue.slug)
    cardsByVenueId.value = {
      ...cardsByVenueId.value,
      [venue.id]: response.customer,
    }
    venue.joined_count = 1
    await router.push({ name: 'customer-wallet', query: { venue_id: String(venue.id) } })
  } catch (exception) {
    joinError.value = exception instanceof ApiError ? exception.message : 'Could not join this venue right now.'
  } finally {
    joiningSlug.value = null
  }
}

onMounted(loadVenues)
</script>

<template>
  <AppShell>
    <div class="mx-auto w-full max-w-md">
      <h1 class="text-2xl font-black tracking-tight text-ink">Venues</h1>
      <p class="mt-1 text-sm text-ink-muted">Browse venues, join new ones, or open your loyalty card.</p>

      <label class="mt-5 block">
        <span class="sr-only">Search venues</span>
        <input
          v-model="search"
          type="search"
          placeholder="Search by name or address"
          class="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-ink shadow-sm outline-none border border-border transition placeholder:text-ink-soft focus:border-ink-soft focus:outline-none"
        >
      </label>

      <div v-if="loading" class="mt-6">
        <EmptyState compact title="Loading venues…" />
      </div>

      <ErrorState
        v-else-if="error"
        class="mt-6"
        :message="error"
        @retry="loadVenues"
      />

      <EmptyState
        v-else-if="!filteredVenues.length"
        class="mt-6"
        :icon="search.trim() ? Search : Store"
        :title="search.trim() ? 'No matching venues' : 'No venues yet'"
        :description="search.trim() ? 'Try a different name or address.' : 'Check back soon — new venues will appear here when they launch.'"
      />

      <ul v-else class="mt-6 space-y-3">
        <li
          v-for="venue in filteredVenues"
          :key="venue.id"
          class="rounded-2xl border border-border/80 bg-surface p-4 shadow-sm"
        >
          <div class="flex items-center gap-3">
            <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-muted border border-border/80">
              <img
                :src="venueLogoThumbUrl(venue)"
                :alt="venue.name"
                class="size-full rounded-[14px] object-cover"
              >
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-black text-ink">{{ venue.name }}</p>
              <p v-if="venue.address" class="mt-0.5 truncate text-sm text-ink-muted">{{ venue.address }}</p>
              <p v-else-if="isJoined(venue) && stampsFor(venue.id) !== null" class="mt-0.5 text-sm text-ink-muted">
                {{ stampsFor(venue.id) }} {{ stampsFor(venue.id) === 1 ? 'stamp' : 'stamps' }}
              </p>
            </div>
          </div>

          <div class="mt-4">
            <RouterLink
              v-if="isJoined(venue)"
              :to="{ name: 'customer-wallet', query: { venue_id: String(venue.id) } }"
              class="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-soft"
            >
              View loyalty card
              <span v-if="stampsFor(venue.id) !== null" class="ml-2 text-white/70">
                · {{ stampsFor(venue.id) }} {{ stampsFor(venue.id) === 1 ? 'stamp' : 'stamps' }}
              </span>
            </RouterLink>

            <AsyncActionButton
              v-else
              class="w-full"
              block
              idle-label="Join & collect rewards"
              loading-label="Joining…"
              success-label="Joined ✓"
              :loading="joiningSlug === venue.slug"
              :disabled="joiningSlug !== null && joiningSlug !== venue.slug"
              @click="joinVenue(venue)"
            />
          </div>
        </li>
      </ul>

      <p v-if="joinError" class="mt-4 rounded-2xl bg-danger-soft p-3 text-center text-sm font-semibold text-danger">
        {{ joinError }}
      </p>
    </div>
  </AppShell>
</template>
