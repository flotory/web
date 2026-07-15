<script setup lang="ts">
import { MoreHorizontal, Plus, Search, Store } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'

import AppAlert from '@/components/ui/AppAlert.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import FormSelect from '@/components/ui/FormSelect.vue'
import VenueAddressInput from '@/components/ui/VenueAddressInput.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError, apiErrorMessage } from '@/lib/api'
import { additionalVenueCreateFreshPath } from '@/lib/additionalVenueCreate'
import { toast } from '@/lib/toast'
import { normalizeVenueCategory, VENUE_CATEGORIES, type VenueCategory } from '@/lib/venueCategories'
import { listingStatusLabel, listingStatusTone } from '@/lib/venueListing'
import { branchAnchorFor as resolveBranchAnchor, venueStatsLine, venueSubtitle } from '@/lib/venueLocationCard'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import type { Venue } from '@/types'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const workspace = useWorkspaceStore()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const menuVenueId = ref<number | null>(null)
const deleteVenueTarget = ref<Venue | null>(null)
const branchAnchorVenue = ref<Venue | null>(null)
const branchError = ref('')
const branchName = ref('')
const branchAddress = ref('')
const branchLatitude = ref<number | null>(null)
const branchLongitude = ref<number | null>(null)
const branchGooglePlaceId = ref<string | null>(null)
const branchAddressInput = ref<InstanceType<typeof VenueAddressInput> | null>(null)
const addBranchAction = useAsyncAction()
const search = ref('')
const typeFilter = ref<'all' | VenueCategory>('all')
const sortBy = ref<'activity' | 'name' | 'customers'>('activity')

const activeVenues = computed(() => workspace.activeVenues)
const mayCreateVenue = computed(() => auth.mayCreateVenue)

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

function openCreateForm() {
  if (!mayCreateVenue.value) {
    return
  }

  void router.push(additionalVenueCreateFreshPath())
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

function branchAnchorFor(venue: Venue): Venue {
  return resolveBranchAnchor(activeVenues.value, venue)
}

function resetBranchForm() {
  branchName.value = ''
  branchAddress.value = ''
  branchLatitude.value = null
  branchLongitude.value = null
  branchGooglePlaceId.value = null
  branchError.value = ''
}

function openAddBranchModal(venue: Venue) {
  branchAnchorVenue.value = branchAnchorFor(venue)
  resetBranchForm()
  menuVenueId.value = null
}

function closeAddBranchModal() {
  if (addBranchAction.loading) return
  branchAnchorVenue.value = null
  resetBranchForm()
}

async function addBranch() {
  const anchor = branchAnchorVenue.value
  if (!anchor) return

  if (!branchAddressInput.value?.validateSelection()) {
    branchError.value = 'Select a branch address from the Google suggestions list.'
    return
  }

  try {
    await addBranchAction.run(async () => {
      branchError.value = ''

      try {
        await api(`/venues/${anchor.id}/branches`, {
          method: 'POST',
          body: {
            name: branchName.value,
            address: branchAddress.value,
            latitude: branchLatitude.value ?? undefined,
            longitude: branchLongitude.value ?? undefined,
            google_place_id: branchGooglePlaceId.value ?? undefined,
          },
        })
        await loadVenues()
        toast.success('Branch submitted for approval. Flotory will go live after NFC stands are delivered.')
      } catch (exception) {
        branchError.value = exception instanceof ApiError ? exception.message : 'Could not add branch.'
        throw exception
      }
    })

    closeAddBranchModal()
    await loadVenues()
  } catch {
    // Button shows Failed.
  }
}

onMounted(async () => {
  await auth.refreshCapabilities()
  await loadVenues()
})
</script>

<template>
  <AppShell>
    <PageHeader
      title="My Venues"
      badge="Locations"
      description="Manage loyalty across your locations."
    >
      <template #meta>
        <span class="text-sm font-semibold text-ink-soft">
          {{ totals.venues }} venues · {{ totals.visits }} scans this week · {{ totals.rewards }} active rewards
        </span>
      </template>
      <template #actions>
        <AppButton v-if="mayCreateVenue" @click="openCreateForm">
          <Plus class="size-4" />
          Create venue
        </AppButton>
      </template>
    </PageHeader>

    <AppCard v-if="activeVenues.length" wrapper-class="mb-5 border-border/80 bg-surface/95 backdrop-blur">
      <div class="grid gap-3 md:grid-cols-[1.3fr_0.85fr_0.85fr]">
        <input
          v-model="search"
          class="h-11 rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft"
          placeholder="Search venue"
        >
        <FormSelect v-model="typeFilter" size="compact" class="w-full">
          <option value="all">All types</option>
          <option v-for="option in VENUE_CATEGORIES" :key="option.id" :value="option.id">
            {{ option.label }}
          </option>
        </FormSelect>
        <FormSelect v-model="sortBy" size="compact" class="w-full">
          <option value="activity">Sort by activity</option>
          <option value="name">Sort by name</option>
          <option value="customers">Sort by customers</option>
        </FormSelect>
      </div>
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
      v-else-if="!loading && !activeVenues.length && !error && mayCreateVenue"
      class="mb-5"
      :icon="Store"
      title="Create your first venue"
      description="Set up your venue profile, upload branding, and submit for Flotory review."
    >
      <AppButton @click="openCreateForm">Create venue</AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="!loading && !activeVenues.length && !error"
      class="mb-5"
      :icon="Store"
      title="No venues in your workspace"
      description="New venues are onboarded by the Flotory team after a demo call — typically within 1–3 business days."
    >
      <div class="flex flex-wrap justify-center gap-2">
        <RouterLink to="/book-demo">
          <AppButton>Book A Demo</AppButton>
        </RouterLink>
        <RouterLink to="/contact">
          <AppButton variant="secondary">Contact us</AppButton>
        </RouterLink>
      </div>
    </EmptyState>

    <div v-if="!loading && filteredVenues.length" class="grid gap-3 overflow-visible lg:grid-cols-2">
      <AppCard
        v-for="venue in filteredVenues"
        :key="venue.id"
        :padded="false"
        :wrapper-class="[
          'group overflow-visible border-border/70 transition hover:border-border hover:shadow-md',
          menuVenueId === venue.id ? 'relative z-50' : '',
        ].join(' ')"
      >
        <div class="flex items-center gap-3 p-4 sm:p-5">
          <button
            type="button"
            class="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left transition group-hover:opacity-95"
            @click="openVenue(venue, '/dashboard')"
          >
            <img
              :src="venueLogoThumbUrl(venue)"
              :alt="venue.name"
              class="size-14 shrink-0 rounded-2xl border border-border object-cover bg-surface-muted"
            >

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate text-lg font-bold text-ink">{{ venue.name }}</h2>
                <AppBadge :tone="listingStatusTone(venue.status ?? 'draft')">
                  {{ listingStatusLabel(venue.status ?? 'draft') }}
                </AppBadge>
                <AppBadge v-if="venue.is_primary === false" tone="slate">Branch</AppBadge>
              </div>

              <p class="mt-1 truncate text-sm text-ink-muted">
                {{ venueSubtitle(venue) }}
              </p>

              <p class="mt-2 text-xs font-medium text-ink-soft">
                {{ venueStatsLine(venue) }}
              </p>
            </div>
          </button>

          <div class="relative shrink-0 self-start border-l border-border pl-2">
            <button
              type="button"
              class="grid size-10 place-items-center rounded-xl text-ink-muted transition hover:bg-surface-muted hover:text-ink"
              :aria-expanded="menuVenueId === venue.id"
              aria-label="Venue options"
              @click.stop="toggleMenu(venue.id)"
            >
              <MoreHorizontal class="size-5" />
            </button>

            <div
              v-if="menuVenueId === venue.id"
              class="absolute right-0 top-full z-[60] mt-1 w-44 rounded-2xl border border-border bg-surface p-2 shadow-xl"
            >
              <button
                class="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-muted hover:bg-surface-muted"
                @click="openVenue(venue, `/my-venues/${venue.id}/setup-files`); menuVenueId = null"
              >
                Files
              </button>
              <button
                class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-muted hover:bg-surface-muted"
                @click="router.push(`/my-venues/${venue.id}/settings`); menuVenueId = null"
              >
                Settings
              </button>
              <button
                class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink-muted hover:bg-surface-muted"
                @click="openAddBranchModal(venue)"
              >
                Add branch
              </button>
              <button
                class="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger-soft"
                :disabled="saving"
                @click="openDeleteModal(venue)"
              >
                Delete venue
              </button>
            </div>
          </div>
        </div>
      </AppCard>
    </div>

    <button
      v-if="menuVenueId !== null"
      type="button"
      class="fixed inset-0 z-40 cursor-default bg-transparent"
      aria-label="Close venue menu"
      @click="menuVenueId = null"
    />

    <div
      v-if="branchAnchorVenue"
      class="fixed inset-0 z-40 grid place-items-center bg-primary/40 px-4 backdrop-blur-sm"
      @click.self="closeAddBranchModal"
    >
      <AppCard wrapper-class="w-full max-w-lg border-border bg-surface p-6">
        <h2 class="text-2xl font-black text-ink">Add branch</h2>
        <p class="mt-2 text-sm font-semibold text-ink-muted">
          New location under <span class="font-bold text-ink">{{ branchAnchorVenue.brand_name ?? branchAnchorVenue.name }}</span>.
          Rewards and guest cards stay shared. Flotory reviews each branch before it goes live and NFC stands are delivered.
        </p>

        <form class="mt-5 grid gap-4" @submit.prevent="addBranch">
          <div>
            <label class="text-sm font-bold text-ink-muted" for="my-venues-branch-name">Branch name<span class="text-danger" aria-hidden="true"> *</span></label>
            <input
              id="my-venues-branch-name"
              v-model="branchName"
              required
              class="mt-2 h-12 w-full rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus:border-ink-soft"
              :placeholder="`${branchAnchorVenue.brand_name ?? branchAnchorVenue.name} · Kentron`"
            >
          </div>
          <VenueAddressInput
            id="my-venues-branch-address"
            ref="branchAddressInput"
            v-model:address="branchAddress"
            v-model:latitude="branchLatitude"
            v-model:longitude="branchLongitude"
            v-model:google-place-id="branchGooglePlaceId"
            label="Branch address"
            required
            hint="Pick a Google suggestion so guests see the right map pin."
          />
          <AppAlert v-if="branchError">{{ branchError }}</AppAlert>
          <div class="grid gap-2 sm:grid-cols-2">
            <AppButton type="button" variant="secondary" :disabled="addBranchAction.loading" @click="closeAddBranchModal">Cancel</AppButton>
            <AsyncActionButton
              type="submit"
              idle-label="Add branch"
              loading-label="Adding…"
              success-label="Added ✓"
              :loading="addBranchAction.loading"
              :success="addBranchAction.success"
              :error="addBranchAction.error"
              :disabled="!branchName.trim()"
            />
          </div>
        </form>
      </AppCard>
    </div>

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
