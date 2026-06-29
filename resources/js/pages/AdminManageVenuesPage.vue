<script setup lang="ts">
import { Pencil, Plus, Search, Store } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import VenueAddressInput from '@/components/ui/VenueAddressInput.vue'
import { useAdminVenueManagement } from '@/composables/useAdminVenueManagement'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import { listingStatusLabel, listingStatusTone } from '@/lib/venueListing'

const router = useRouter()
const search = ref('')
const statusFilter = ref<'pending_review' | 'published' | 'draft' | 'rejected' | ''>('')
const includeArchived = ref(false)
const formOpen = ref(false)
const creating = ref(false)
const createError = ref('')

const venueName = ref('')
const venueSlug = ref('')
const ownerEmail = ref('')
const ownerName = ref('')
const address = ref('')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const googlePlaceId = ref<string | null>(null)
const addressInput = ref<InstanceType<typeof VenueAddressInput> | null>(null)

const {
  loading,
  error,
  venues,
  page,
  lastPage,
  total,
  title,
  loadVenues,
} = useAdminVenueManagement({ search, statusFilter, includeArchived })

function setStatusFilter(value: typeof statusFilter.value) {
  statusFilter.value = value
}

function toggleCreateForm() {
  formOpen.value = !formOpen.value
  if (!formOpen.value) {
    resetCreateForm()
  }
}

function resetCreateForm() {
  venueName.value = ''
  venueSlug.value = ''
  ownerEmail.value = ''
  ownerName.value = ''
  address.value = ''
  latitude.value = null
  longitude.value = null
  googlePlaceId.value = null
  createError.value = ''
}

async function createVenue() {
  if (address.value && addressInput.value && !addressInput.value.validateSelection()) {
    createError.value = 'Select an address from the Google suggestions list.'
    return
  }

  creating.value = true
  createError.value = ''

  try {
    const response = await api<{ venue: { id: number } }>('/admin/manage-venues', {
      method: 'POST',
      body: {
        name: venueName.value,
        slug: venueSlug.value || undefined,
        owner_email: ownerEmail.value,
        owner_name: ownerName.value || undefined,
        address: address.value || undefined,
        latitude: latitude.value ?? undefined,
        longitude: longitude.value ?? undefined,
        google_place_id: googlePlaceId.value ?? undefined,
      },
    })

    resetCreateForm()
    formOpen.value = false
    await loadVenues()
    await router.push(`/admin/manage-venues/${response.venue.id}`)
  } catch (exception) {
    createError.value = exception instanceof ApiError ? exception.message : 'Could not create venue.'
  } finally {
    creating.value = false
  }
}

onMounted(loadVenues)
</script>

<template>
  <AppShell>
    <PageHeader
      title="Manage venues"
      badge="Admin"
      description="Provision new venues for sales-led onboarding, or search and edit existing ones."
    >
      <template #actions>
        <AppButton @click="toggleCreateForm">
          <Plus class="size-4" />
          Create venue
        </AppButton>
      </template>
    </PageHeader>

    <AppCard v-if="formOpen" wrapper-class="mb-5">
      <h2 class="text-xl font-black text-ink">Provision venue</h2>
      <p class="mt-1 text-sm text-ink-muted">Creates a draft venue and assigns an owner by email (creates the user if needed).</p>

      <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="createVenue">
        <div>
          <label class="text-sm font-bold text-ink-muted" for="admin-venue-name">Venue name</label>
          <input id="admin-venue-name" v-model="venueName" required class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="admin-venue-slug">Slug (optional)</label>
          <input id="admin-venue-slug" v-model="venueSlug" class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="admin-owner-email">Owner email</label>
          <input id="admin-owner-email" v-model="ownerEmail" required type="email" class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="admin-owner-name">Owner name (optional)</label>
          <input id="admin-owner-name" v-model="ownerName" class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft">
        </div>
        <div class="md:col-span-2">
          <VenueAddressInput
            id="admin-venue-address"
            ref="addressInput"
            v-model:address="address"
            v-model:latitude="latitude"
            v-model:longitude="longitude"
            v-model:google-place-id="googlePlaceId"
            hint="Optional. Pick a Google suggestion so we can save map coordinates."
          />
        </div>
        <p v-if="createError" class="md:col-span-2 rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ createError }}</p>
        <div class="flex flex-wrap gap-2 md:col-span-2">
          <AppButton type="submit" :disabled="creating">{{ creating ? 'Creating…' : 'Create venue' }}</AppButton>
          <AppButton type="button" variant="secondary" @click="formOpen = false; resetCreateForm()">Cancel</AppButton>
        </div>
      </form>
    </AppCard>

    <AppCard wrapper-class="mb-5">
      <label class="text-sm font-bold text-ink-muted" for="admin-manage-venue-search">Search</label>
      <div class="relative mt-2">
        <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <input
          id="admin-manage-venue-search"
          v-model="search"
          class="h-12 w-full rounded-2xl border border-border bg-surface py-0 pl-11 pr-4 text-sm font-medium text-ink outline-none focus:border-ink-soft"
          placeholder="Name, slug, or address"
        >
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton :variant="statusFilter === '' ? 'primary' : 'secondary'" @click="setStatusFilter('')">
          All statuses
        </AppButton>
        <AppButton :variant="statusFilter === 'pending_review' ? 'primary' : 'secondary'" @click="setStatusFilter('pending_review')">
          Pending
        </AppButton>
        <AppButton :variant="statusFilter === 'published' ? 'primary' : 'secondary'" @click="setStatusFilter('published')">
          Published
        </AppButton>
        <AppButton :variant="statusFilter === 'draft' ? 'primary' : 'secondary'" @click="setStatusFilter('draft')">
          Draft
        </AppButton>
        <AppButton :variant="statusFilter === 'rejected' ? 'primary' : 'secondary'" @click="setStatusFilter('rejected')">
          Rejected
        </AppButton>
      </div>

      <label class="mt-4 flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <input v-model="includeArchived" type="checkbox" class="size-4 rounded border-border">
        Include archived venues
      </label>

      <p v-if="total > 0" class="mt-3 text-xs font-semibold text-ink-muted">
        {{ total }} venue{{ total === 1 ? '' : 's' }} · {{ title }}
      </p>
    </AppCard>

    <ErrorState v-if="error" class="mb-4" :message="error" @retry="loadVenues" />

    <AppCard v-else-if="loading">
      <EmptyState compact title="Loading venues…" />
    </AppCard>

    <div v-else class="space-y-4">
      <AppCard v-if="venues.length === 0">
        <EmptyState title="No venues found" message="Try a different search or filter." />
      </AppCard>

      <AppCard v-for="venue in venues" :key="venue.id">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <Store class="size-4 text-ink-muted" />
              <h2 class="text-xl font-black text-ink">{{ venue.name }}</h2>
              <AppBadge :tone="listingStatusTone(venue.status)">{{ listingStatusLabel(venue.status) }}</AppBadge>
              <AppBadge v-if="venue.archived" tone="amber">Archived</AppBadge>
            </div>
            <p class="mt-2 text-sm font-medium text-ink-muted">
              {{ venue.address || 'No address yet' }}
            </p>
            <p class="mt-1 text-sm text-ink-soft">
              Owner: {{ venue.owner?.name ?? 'Unknown' }} · {{ venue.owner?.email ?? '—' }}
            </p>
            <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {{ venue.active_rewards_count }} rewards · {{ venue.customers_count }} customers
            </p>
          </div>

          <AppButton variant="secondary" @click="router.push(`/admin/manage-venues/${venue.id}`)">
            <span class="inline-flex items-center gap-2">
              <Pencil class="size-4" />
              Edit venue
            </span>
          </AppButton>
        </div>
      </AppCard>

      <div v-if="lastPage > 1" class="flex items-center justify-center gap-3">
        <AppButton variant="secondary" :disabled="page <= 1" @click="page -= 1">
          Previous
        </AppButton>
        <span class="text-sm font-semibold text-ink-muted">Page {{ page }} of {{ lastPage }}</span>
        <AppButton variant="secondary" :disabled="page >= lastPage" @click="page += 1">
          Next
        </AppButton>
      </div>
    </div>
  </AppShell>
</template>
