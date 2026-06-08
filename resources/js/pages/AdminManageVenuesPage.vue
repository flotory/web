<script setup lang="ts">
import { Pencil, Search, Store } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useAdminVenueManagement } from '@/composables/useAdminVenueManagement'
import AppShell from '@/layouts/AppShell.vue'
import { listingStatusLabel, listingStatusTone } from '@/lib/venueListing'

const router = useRouter()
const search = ref('')
const statusFilter = ref<'pending_review' | 'published' | 'draft' | 'rejected' | ''>('')
const includeArchived = ref(false)

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

onMounted(loadVenues)
</script>

<template>
  <AppShell>
    <PageHeader
      title="Manage venues"
      badge="Admin"
      description="Search and edit any venue on the platform — name, address, branding, and contact details."
    />

    <AppCard wrapper-class="mb-5">
      <label class="text-sm font-bold text-ink-muted" for="admin-manage-venue-search">Search</label>
      <div class="relative mt-2">
        <Search class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <input
          id="admin-manage-venue-search"
          v-model="search"
          class="h-12 w-full rounded-2xl border border-border bg-surface-muted py-0 pl-11 pr-4 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface"
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
