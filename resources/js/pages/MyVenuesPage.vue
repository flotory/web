<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import StatCard from '@/components/loyalty/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
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
const name = ref('')
const slug = ref('')
const address = ref('')
const phone = ref('')
const website = ref('')

const activeVenues = computed(() => workspace.activeVenues)
const archivedVenues = computed(() => workspace.venues.filter((venue) => venue.archived))

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
    const payload = {
      name: name.value,
      slug: slug.value || undefined,
      address: address.value || undefined,
      phone: phone.value || undefined,
      website: website.value || undefined,
    }

    await api<{ venue: Venue }>('/venues', {
      method: 'POST',
      body: payload,
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

async function archiveVenue(venue: Venue) {
  saving.value = true
  error.value = ''

  try {
    await api<void>(`/venues/${venue.id}`, { method: 'DELETE' })
    await loadVenues()
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not archive venue.'
  } finally {
    saving.value = false
  }
}

function openVenue(venue: Venue, path: string) {
  workspace.setFilter(venue.id)
  router.push(path)
}

onMounted(loadVenues)
</script>

<template>
  <AppShell>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <AppBadge tone="blue">Workspace</AppBadge>
        <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">My Venues</h1>
        <p class="mt-2 text-slate-500">Create and manage the venues your team operates every day.</p>
      </div>
      <AppButton @click="openCreateForm">Create venue</AppButton>
    </div>

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
            <input
              id="venue-name"
              v-model="name"
              required
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
              placeholder="Harbor Coffee"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-slug">Slug</label>
            <input
              id="venue-slug"
              v-model="slug"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
              placeholder="harbor-coffee"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-website">Website optional</label>
            <input
              id="venue-website"
              v-model="website"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
              placeholder="https://example.com"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-address">Address optional</label>
            <input
              id="venue-address"
              v-model="address"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
              placeholder="12 Market Street"
            >
          </div>
          <div>
            <label class="text-sm font-bold text-slate-600" for="venue-phone">Phone optional</label>
            <input
              id="venue-phone"
              v-model="phone"
              class="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-slate-400 focus:bg-white"
              placeholder="+1 555 0100"
            >
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

    <div class="grid gap-4 lg:grid-cols-2">
      <AppCard v-for="venue in activeVenues" :key="venue.id">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-4">
            <div class="grid size-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-slate-100 text-xl font-black text-slate-400 ring-1 ring-slate-200">
              <img v-if="venue.logo" :src="venue.logo" alt="" class="size-full object-cover">
              <span v-else>{{ venue.name.slice(0, 1) }}</span>
            </div>
            <div>
              <h2 class="text-2xl font-black text-slate-950">{{ venue.name }}</h2>
              <p class="mt-1 text-sm font-semibold text-slate-500">/{{ venue.slug }}</p>
              <p v-if="venue.address" class="mt-2 text-sm font-semibold text-slate-500">{{ venue.address }}</p>
            </div>
          </div>
        </div>

        <AppButton class="mt-5 w-full" size="lg" @click="router.push(`/scanner?venue_id=${venue.id}`)">
          Scan customers at {{ venue.name }}
        </AppButton>

        <div class="mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Customers" :value="venue.customers_count ?? 0" />
          <StatCard label="Visits" :value="venue.visits_count ?? 0" />
          <StatCard label="Rewards" :value="venue.rewards_count ?? 0" />
        </div>

        <div class="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <AppButton variant="secondary" size="sm" @click="openVenue(venue, '/dashboard')">Dashboard</AppButton>
          <AppButton variant="secondary" size="sm" @click="openVenue(venue, '/analytics')">Analytics</AppButton>
          <AppButton variant="secondary" size="sm" @click="openVenue(venue, '/rewards')">Rewards</AppButton>
          <AppButton variant="secondary" size="sm" @click="openVenue(venue, '/customers')">Customers</AppButton>
          <AppButton variant="secondary" size="sm" @click="openVenue(venue, '/team')">Team</AppButton>
          <AppButton variant="ghost" size="sm" @click="router.push(`/my-venues/${venue.id}/settings`)">Settings</AppButton>
          <AppButton variant="ghost" size="sm" :disabled="saving" @click="archiveVenue(venue)">Archive</AppButton>
        </div>
      </AppCard>

      <AppCard v-if="!loading && !activeVenues.length">
        <p class="text-sm font-semibold text-slate-500">No active venues yet. Create your first venue to start.</p>
      </AppCard>
    </div>

    <section v-if="archivedVenues.length" class="mt-8">
      <h2 class="text-xl font-black text-slate-950">Archived venues</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <AppCard v-for="venue in archivedVenues" :key="venue.id" wrapper-class="opacity-70">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="font-black text-slate-950">{{ venue.name }}</p>
              <p class="text-sm font-semibold text-slate-500">/{{ venue.slug }}</p>
            </div>
            <AppBadge>Archived</AppBadge>
          </div>
        </AppCard>
      </div>
    </section>
  </AppShell>
</template>
