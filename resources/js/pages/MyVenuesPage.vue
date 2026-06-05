<script setup lang="ts">
import { Search, Store } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PhoneInput from '@/components/ui/PhoneInput.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { normalizeVenueCategory } from '@/lib/defaultImages'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { venueCoverThumbUrl, venueLogoThumbUrl } from '@/lib/venueMedia'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()

const loading = ref(true)
const createVenueAction = useAsyncAction()
const saving = ref(false)
const error = ref('')
const formOpen = ref(false)
const menuVenueId = ref<number | null>(null)
const deleteVenueTarget = ref<Venue | null>(null)
const search = ref('')
const typeFilter = ref<'all' | 'cafe' | 'restaurant' | 'bar' | 'bakery'>('all')
const sortBy = ref<'activity' | 'name' | 'customers'>('activity')

const name = ref('')
const slug = ref('')
const address = ref('')
const phone = ref('')
const website = ref('')

const activeVenues = computed(() => workspace.activeVenues)

const totals = computed(() => ({
  venues: activeVenues.value.length,
  visits: activeVenues.value.reduce((sum, venue) => sum + (venue.visits_count ?? 0), 0),
  rewards: activeVenues.value.reduce((sum, venue) => sum + (venue.rewards_count ?? 0), 0),
}))

const filteredVenues = computed(() => {
  let items = [...activeVenues.value]

  const query = search.value.trim().toLowerCase()
  if (query) {
    items = items.filter((venue) => `${venue.name} ${venue.slug} ${venue.address ?? ''}`.toLowerCase().includes(query))
  }

  if (typeFilter.value !== 'all') {
    items = items.filter((venue) => normalizeVenueCategory(venue.category) === typeFilter.value)
  }

  if (sortBy.value === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy.value === 'customers') {
    items.sort((a, b) => (b.customers_count ?? 0) - (a.customers_count ?? 0))
  } else {
    items.sort((a, b) => (b.visits_count ?? 0) - (a.visits_count ?? 0))
  }

  return items
})

function venueTypeLabel(venue: Venue): string {
  const type = normalizeVenueCategory(venue.category)
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function resetForm() {
  name.value = ''
  slug.value = ''
  address.value = ''
  phone.value = ''
  website.value = ''
}

function openCreateForm() {
  resetForm()
  formOpen.value = true
}

function toggleMenu(venueId: number) {
  menuVenueId.value = menuVenueId.value === venueId ? null : venueId
}

async function loadVenues() {
  loading.value = true
  error.value = ''

  try {
    await workspace.bootstrap(true)
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load your venues.')
  } finally {
    loading.value = false
  }
}

async function createVenue() {
  try {
    await createVenueAction.run(async () => {
      error.value = ''

      try {
        await api<{ venue: Venue }>('/venues', {
          method: 'POST',
          body: {
            name: name.value,
            slug: slug.value || undefined,
            address: address.value || undefined,
            phone: phone.value || undefined,
            website: website.value || undefined,
          },
        })

        resetForm()
        formOpen.value = false
        await auth.fetchUser()
        await loadVenues()
      } catch (exception) {
        error.value = exception instanceof ApiError ? exception.message : 'Could not create venue.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
  }
}

async function deleteVenue(venue: Venue) {
  saving.value = true
  error.value = ''

  try {
    await api<void>(`/venues/${venue.id}`, { method: 'DELETE' })
    workspace.venues = workspace.venues.filter((item) => item.id !== venue.id)
    if (workspace.filterVenueId === venue.id) {
      const next = workspace.activeVenues[0] ?? null
      workspace.setFilter(next ? next.id : null)
    }
    await loadVenues()
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not delete venue.'
  } finally {
    saving.value = false
    menuVenueId.value = null
    deleteVenueTarget.value = null
  }
}

function openVenue(venue: Venue, path: string) {
  workspace.setFilter(venue.id)
  router.push(path)
}

function openDeleteModal(venue: Venue) {
  deleteVenueTarget.value = venue
  menuVenueId.value = null
}

function closeDeleteModal() {
  if (saving.value) return
  deleteVenueTarget.value = null
}

onMounted(loadVenues)
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">Workspace</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-ink">My Venues</h1>
        <p class="mt-2 text-ink-muted">Manage loyalty across your locations.</p>
        <p class="mt-2 text-sm font-semibold text-ink-soft">
          {{ totals.venues }} venues • {{ totals.visits }} scans this week • {{ totals.rewards }} active rewards
        </p>
      </div>
      <AppButton class="bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-soft" @click="openCreateForm">+ Create new venue</AppButton>
    </div>

    <AppCard wrapper-class="mb-5 border-border/80 bg-surface/95 backdrop-blur">
      <div class="grid gap-3 md:grid-cols-[1.3fr_0.85fr_0.85fr]">
        <input
          v-model="search"
          class="h-11 rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface"
          placeholder="Search venue"
        >
        <select v-model="typeFilter" class="h-11 rounded-2xl border border-border bg-surface-muted px-4 text-sm font-semibold outline-none focus:border-ink-soft focus:bg-surface">
          <option value="all">All types</option>
          <option value="cafe">Cafe</option>
          <option value="restaurant">Restaurant</option>
          <option value="bar">Bar</option>
          <option value="bakery">Bakery</option>
        </select>
        <select v-model="sortBy" class="h-11 rounded-2xl border border-border bg-surface-muted px-4 text-sm font-semibold outline-none focus:border-ink-soft focus:bg-surface">
          <option value="activity">Sort by activity</option>
          <option value="name">Sort by name</option>
          <option value="customers">Sort by customers</option>
        </select>
      </div>
    </AppCard>

    <AppCard v-if="formOpen" wrapper-class="mb-5">
      <form class="grid gap-4" @submit.prevent="createVenue">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-black text-ink">Create venue</h2>
            <p class="mt-1 text-sm font-semibold text-ink-muted">Profile details customers and staff will recognize.</p>
          </div>
          <div class="grid size-16 place-items-center overflow-hidden rounded-3xl bg-surface-muted text-xl font-black text-ink-soft ring-1 ring-border">
            {{ name.slice(0, 1) || 'V' }}
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-[1fr_180px]">
          <div>
            <label class="text-sm font-bold text-ink-muted" for="venue-name">Venue name</label>
            <input id="venue-name" v-model="name" required class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface" placeholder="Harbor Coffee">
          </div>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="venue-slug">Slug</label>
            <input id="venue-slug" v-model="slug" class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface" placeholder="harbor-coffee">
          </div>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="venue-website">Website optional</label>
            <input id="venue-website" v-model="website" class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface" placeholder="https://example.com">
          </div>
          <div>
            <label class="text-sm font-bold text-ink-muted" for="venue-address">Address</label>
            <input
              id="venue-address"
              v-model="address"
              class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface-muted px-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface"
              placeholder="12 Market Street, Toruń"
            >
            <p class="mt-2 text-xs font-medium text-ink-muted">
              Shown on your public venue page and used for Google Maps.
            </p>
          </div>
          <PhoneInput id="venue-phone" v-model="phone" label="Phone" />
        </div>

        <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>

        <div class="flex flex-wrap gap-2">
          <AsyncActionButton
            type="submit"
            idle-label="Create venue"
            loading-label="Creating…"
            success-label="Created ✓"
            :loading="createVenueAction.loading"
            :success="createVenueAction.success"
            :error="createVenueAction.error"
          />
          <AppButton type="button" variant="secondary" @click="formOpen = false">Cancel</AppButton>
        </div>
      </form>
    </AppCard>

    <AppCard v-if="loading" wrapper-class="mb-4">
      <EmptyState compact title="Loading venues…" />
    </AppCard>
    <ErrorState
      v-else-if="error && !activeVenues.length"
      class="mb-4"
      :message="error"
      @retry="loadVenues"
    />

    <EmptyState
      v-else-if="!loading && !filteredVenues.length && activeVenues.length"
      class="mb-5"
      :icon="Search"
      title="No venues match this filter"
      description="Try clearing your search or changing the type filter."
    />

    <EmptyState
      v-else-if="!loading && !activeVenues.length && !error"
      class="mb-5"
      :icon="Store"
      title="Create your first venue"
      description="Set up a loyalty program and start collecting stamps from guests."
    >
      <AppButton @click="openCreateForm">Create venue</AppButton>
    </EmptyState>

    <div v-if="!loading && filteredVenues.length" class="grid gap-5 lg:grid-cols-2">
      <AppCard
        v-for="venue in filteredVenues"
        :key="venue.id"
        wrapper-class="group relative overflow-hidden border-border/80 p-0 shadow-sm transition hover:shadow-xl"
      >
        <img :src="venueCoverThumbUrl(venue)" alt="" class="h-24 w-full object-cover">
        <div class="relative p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface text-xl font-black shadow-sm ring-2 ring-white -mt-10">
              <img :src="venueLogoThumbUrl(venue)" :alt="venue.name" class="size-full object-cover">
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-2xl font-black text-ink">{{ venue.name }}</h2>
                <AppBadge tone="green">Active</AppBadge>
                <AppBadge tone="blue">{{ venueTypeLabel(venue) }}</AppBadge>
              </div>
              <p class="mt-1 text-sm font-semibold text-ink-muted">/{{ venue.slug }}</p>
            </div>
          </div>
          <div class="relative">
            <button type="button" class="rounded-xl bg-surface-muted px-3 py-2 text-sm font-black text-ink-muted hover:bg-border" @click="toggleMenu(venue.id)">⋯</button>
            <div v-if="menuVenueId === venue.id" class="absolute right-0 z-50 mt-2 w-40 rounded-2xl bg-surface p-2 shadow-xl ring-1 ring-border">
              <button class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-muted hover:bg-surface-muted" @click="router.push(`/my-venues/${venue.id}/settings`)">Settings</button>
              <button class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-soft" :disabled="saving" @click="openDeleteModal(venue)">Delete venue</button>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="rounded-xl bg-surface p-3 ring-1 ring-border">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">◎ Guests</p>
            <p class="mt-1 text-sm font-black text-ink">{{ venue.customers_count ?? 0 }}</p>
          </div>
          <div class="rounded-xl bg-surface p-3 ring-1 ring-border">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">↻ Visits</p>
            <p class="mt-1 text-sm font-black text-ink">{{ venue.visits_count ?? 0 }}</p>
          </div>
          <div class="rounded-xl bg-surface p-3 ring-1 ring-border">
            <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">◈ Rewards</p>
            <p class="mt-1 text-sm font-black text-ink">{{ venue.rewards_count ?? 0 }}</p>
          </div>
          <div class="grid place-items-center rounded-xl bg-surface p-3 ring-1 ring-border">
            <div class="inline-flex rounded-lg bg-surface p-1 ring-1 ring-border">
              <QrcodeVue :value="buildVenueLandingUrl(venue.slug)" :size="42" level="M" render-as="canvas" :margin="1" />
            </div>
          </div>
        </div>

        <div class="mt-4 grid gap-2 sm:grid-cols-3">
          <AppButton class="w-full" size="sm" @click="openVenue(venue, '/dashboard')">Open dashboard</AppButton>
          <AppButton class="w-full" size="sm" variant="secondary" @click="router.push(`/scanner?venue_id=${venue.id}`)">Open scanner</AppButton>
          <AppButton class="w-full" size="sm" variant="secondary" @click="router.push(`/my-venues/${venue.id}/settings`)">Settings</AppButton>
        </div>
        </div>
      </AppCard>
    </div>

    <button
      v-if="menuVenueId !== null"
      type="button"
      class="fixed inset-0 z-30 cursor-default bg-transparent"
      aria-label="Close venue menu"
      @click="menuVenueId = null"
    />

    <div
      v-if="deleteVenueTarget"
      class="fixed inset-0 z-40 grid place-items-center bg-primary/40 px-4 backdrop-blur-sm"
      @click.self="closeDeleteModal"
    >
      <AppCard wrapper-class="w-full max-w-md border-border bg-surface p-6">
        <h2 class="text-2xl font-black text-ink">Delete venue?</h2>
        <p class="mt-2 text-sm text-ink-muted">
          This will soft-delete <span class="font-bold text-ink">{{ deleteVenueTarget.name }}</span>.
          You can restore it later from the database.
        </p>
        <div class="mt-5 grid gap-2 sm:grid-cols-2">
          <AppButton variant="secondary" :disabled="saving" @click="closeDeleteModal">Cancel</AppButton>
          <AppButton :disabled="saving" class="bg-danger text-primary-text hover:bg-danger/90" @click="deleteVenue(deleteVenueTarget)">
            {{ saving ? 'Deleting...' : 'Yes, delete venue' }}
          </AppButton>
        </div>
      </AppCard>
    </div>
  </AppShell>
</template>
