<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import { buildVenueLandingUrl } from '@/lib/onboarding'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

const router = useRouter()
const auth = useAuthStore()
const workspace = useWorkspaceStore()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const formOpen = ref(false)
const menuVenueId = ref<number | null>(null)
const deleteVenueTarget = ref<Venue | null>(null)
const search = ref('')
const typeFilter = ref<'all' | 'cafe' | 'restaurant' | 'bar'>('all')
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
    items = items.filter((venue) => inferVenueType(venue) === typeFilter.value)
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

function inferVenueType(venue: Venue): 'cafe' | 'restaurant' | 'bar' {
  const text = `${venue.name} ${venue.slug}`.toLowerCase()
  if (text.includes('bar') || text.includes('cocktail') || text.includes('pub')) return 'bar'
  if (text.includes('restaurant') || text.includes('grill') || text.includes('kitchen')) return 'restaurant'
  return 'cafe'
}

function venueTypeLabel(venue: Venue): string {
  const type = inferVenueType(venue)
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
  } catch {
    error.value = 'Could not load your venues.'
  } finally {
    loading.value = false
  }
}

async function createVenue() {
  saving.value = true
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
  } finally {
    saving.value = false
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
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">My Venues</h1>
        <p class="mt-2 text-slate-500">Manage loyalty across your locations.</p>
        <p class="mt-2 text-sm font-semibold text-slate-400">
          {{ totals.venues }} venues • {{ totals.visits }} scans this week • {{ totals.rewards }} active rewards
        </p>
      </div>
      <AppButton class="bg-slate-950 text-white shadow-lg shadow-slate-950/25 hover:bg-slate-800" @click="openCreateForm">+ Create new venue</AppButton>
    </div>

    <AppCard wrapper-class="mb-5 border-slate-200/80 bg-white/95 backdrop-blur">
      <div class="grid gap-3 md:grid-cols-[1.3fr_0.85fr_0.85fr]">
        <input
          v-model="search"
          class="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
          placeholder="Search venue"
        >
        <select v-model="typeFilter" class="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white">
          <option value="all">All types</option>
          <option value="cafe">Cafe</option>
          <option value="restaurant">Restaurant</option>
          <option value="bar">Bar</option>
        </select>
        <select v-model="sortBy" class="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white">
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
            <h2 class="text-2xl font-black text-slate-950">Create venue</h2>
            <p class="mt-1 text-sm font-semibold text-slate-500">Profile details customers and staff will recognize.</p>
          </div>
          <div class="grid size-16 place-items-center overflow-hidden rounded-3xl bg-slate-100 text-xl font-black text-slate-400 ring-1 ring-slate-200">
            {{ name.slice(0, 1) || 'V' }}
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-[1fr_180px]">
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-name">Venue name</label>
            <input id="venue-name" v-model="name" required class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="Harbor Coffee">
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-slug">Slug</label>
            <input id="venue-slug" v-model="slug" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="harbor-coffee">
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-website">Website optional</label>
            <input id="venue-website" v-model="website" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="https://example.com">
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-address">Address optional</label>
            <input id="venue-address" v-model="address" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="12 Market Street">
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-phone">Phone optional</label>
            <input id="venue-phone" v-model="phone" class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white" placeholder="+1 555 0100">
          </div>
        </div>

        <p v-if="error" class="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{{ error }}</p>

        <div class="flex flex-wrap gap-2">
          <AppButton type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Create venue' }}</AppButton>
          <AppButton type="button" variant="secondary" @click="formOpen = false">Cancel</AppButton>
        </div>
      </form>
    </AppCard>

    <AppCard v-if="loading" wrapper-class="mb-4">
      <p class="text-sm font-bold text-slate-500">Loading venues...</p>
    </AppCard>
    <AppCard v-else-if="error && !activeVenues.length" wrapper-class="mb-4">
      <p class="text-sm font-bold text-red-600">{{ error }}</p>
    </AppCard>

    <div class="grid gap-5 lg:grid-cols-2">
      <AppCard
        v-for="venue in filteredVenues"
        :key="venue.id"
        wrapper-class="group relative overflow-hidden border-slate-200/80 bg-gradient-to-br from-white to-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_45%)]" />
        <div class="relative flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-xl font-black text-slate-400 ring-1 ring-slate-200">
              <img v-if="venue.logo" :src="venue.logo" alt="" class="size-full object-cover">
              <span v-else>{{ venue.name.slice(0, 1) }}</span>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-2xl font-black text-slate-950">{{ venue.name }}</h2>
                <AppBadge tone="green">Active</AppBadge>
                <AppBadge tone="blue">{{ venueTypeLabel(venue) }}</AppBadge>
              </div>
              <p class="mt-1 text-sm font-semibold text-slate-500">/{{ venue.slug }}</p>
            </div>
          </div>
          <div class="relative">
            <button type="button" class="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-200" @click="toggleMenu(venue.id)">⋯</button>
            <div v-if="menuVenueId === venue.id" class="absolute right-0 z-50 mt-2 w-40 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
              <button class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100" @click="router.push(`/my-venues/${venue.id}/settings`)">Settings</button>
              <button class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50" :disabled="saving" @click="openDeleteModal(venue)">Delete venue</button>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-400">◎ Guests</p>
            <p class="mt-1 text-sm font-black text-slate-900">{{ venue.customers_count ?? 0 }}</p>
          </div>
          <div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-400">↻ Visits</p>
            <p class="mt-1 text-sm font-black text-slate-900">{{ venue.visits_count ?? 0 }}</p>
          </div>
          <div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <p class="text-xs font-bold uppercase tracking-wide text-slate-400">◈ Rewards</p>
            <p class="mt-1 text-sm font-black text-slate-900">{{ venue.rewards_count ?? 0 }}</p>
          </div>
          <div class="grid place-items-center rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <div class="inline-flex rounded-lg bg-white p-1 ring-1 ring-slate-200">
              <QrcodeVue :value="buildVenueLandingUrl(venue.slug)" :size="42" level="M" render-as="canvas" :margin="1" />
            </div>
          </div>
        </div>

        <div class="mt-4 grid gap-2">
          <div class="grid gap-2 sm:grid-cols-3">
            <AppButton class="w-full" size="sm" @click="openVenue(venue, '/dashboard')">Open dashboard</AppButton>
            <AppButton class="w-full" size="sm" variant="secondary" @click="router.push(`/scanner?venue_id=${venue.id}`)">Open scanner</AppButton>
            <AppButton class="w-full" size="sm" variant="secondary" @click="router.push(`/my-venues/${venue.id}/settings`)">Settings</AppButton>
          </div>
          <div class="grid gap-2 sm:grid-cols-3">
            <AppButton variant="ghost" size="sm" @click="openVenue(venue, '/rewards')">Rewards</AppButton>
            <AppButton variant="ghost" size="sm" @click="openVenue(venue, '/customers')">Customers</AppButton>
            <AppButton variant="ghost" size="sm" @click="openVenue(venue, '/analytics')">Analytics</AppButton>
          </div>
        </div>
      </AppCard>

      <AppCard v-if="!loading && !filteredVenues.length">
        <p class="text-sm font-semibold text-slate-500">No venues match this filter yet.</p>
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
      class="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm"
      @click.self="closeDeleteModal"
    >
      <AppCard wrapper-class="w-full max-w-md border-slate-200 bg-white p-6">
        <h2 class="text-2xl font-black text-slate-950">Delete venue?</h2>
        <p class="mt-2 text-sm text-slate-600">
          This will soft-delete <span class="font-bold text-slate-900">{{ deleteVenueTarget.name }}</span>.
          You can restore it later from the database.
        </p>
        <div class="mt-5 grid gap-2 sm:grid-cols-2">
          <AppButton variant="secondary" :disabled="saving" @click="closeDeleteModal">Cancel</AppButton>
          <AppButton :disabled="saving" class="bg-red-600 text-white hover:bg-red-700" @click="deleteVenue(deleteVenueTarget)">
            {{ saving ? 'Deleting...' : 'Yes, delete venue' }}
          </AppButton>
        </div>
      </AppCard>
    </div>
  </AppShell>
</template>
