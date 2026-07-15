<script setup lang="ts">
import { Check, FolderOpen, Store, X } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import ListingChecklist from '@/components/loyalty/ListingChecklist.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PaginationControls from '@/components/ui/PaginationControls.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useVenueReviewQueue } from '@/composables/useVenueReviewQueue'
import { formatShortDate } from '@/lib/formatDate'
import { listingStatusLabel, listingStatusTone } from '@/lib/venueListing'

const router = useRouter()
const statusFilter = ref<'pending_review' | 'published' | 'draft' | 'rejected' | ''>('pending_review')

const {
  loading,
  actingId,
  error,
  venues,
  page,
  lastPage,
  total,
  title,
  rejectNote,
  rejectTarget,
  unpublishNote,
  unpublishTarget,
  loadVenues,
  approveVenue,
  rejectVenue,
  unpublishVenue,
  setStatusFilter,
} = useVenueReviewQueue(statusFilter)

function canApprove(venue: (typeof venues.value)[number]): boolean {
  return venue.final_logo_applied && venue.listing.ready_to_submit
}

onMounted(loadVenues)
</script>

<template>
  <AppShell>
    <PageHeader
      title="Venue listings"
      badge="Admin"
      :description="title"
    />

    <AppCard wrapper-class="mb-5">
      <div class="flex flex-wrap gap-2">
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
      <p v-if="total > 0" class="mt-3 text-xs font-semibold text-ink-muted">
        {{ total }} venue{{ total === 1 ? '' : 's' }}
      </p>
    </AppCard>

    <ErrorState v-if="error" class="mb-4" :message="error" @retry="loadVenues" />

    <AppCard v-else-if="loading">
      <EmptyState compact title="Loading venues…" />
    </AppCard>

    <div v-else class="space-y-4">
      <AppCard v-for="venue in venues" :key="venue.id">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <Store class="size-4 text-ink-muted" />
              <h2 class="text-xl font-black text-ink">{{ venue.name }}</h2>
              <AppBadge :tone="listingStatusTone(venue.status)">{{ listingStatusLabel(venue.status) }}</AppBadge>
              <AppBadge v-if="venue.archived" tone="amber">Archived</AppBadge>
              <AppBadge v-if="venue.setup_files_count > 0" tone="blue">
                {{ venue.setup_files_count }} owner file{{ venue.setup_files_count === 1 ? '' : 's' }}
              </AppBadge>
            </div>
            <p class="mt-2 text-sm font-medium text-ink-muted">
              {{ venue.address || 'No address yet' }}
            </p>
            <p class="mt-1 text-sm text-ink-soft">
              Owner: {{ venue.owner?.name ?? 'Unknown' }} · {{ venue.owner?.email ?? '—' }}
            </p>
            <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {{ venue.active_rewards_count }} rewards · {{ venue.customers_count }} customers
              <span v-if="venue.submitted_at"> · Submitted {{ formatShortDate(venue.submitted_at) }}</span>
            </p>
            <p v-if="venue.status === 'pending_review'" class="mt-2 text-xs font-semibold" :class="venue.final_logo_applied ? 'text-success' : 'text-danger'">
              {{ venue.final_logo_applied ? 'Final logo applied — ready to approve' : 'Crop logo from owner files before approving' }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <AppButton variant="secondary" @click="router.push(`/admin/manage-venues/${venue.id}`)">
              <FolderOpen class="size-4" />
              Review &amp; set up
            </AppButton>
            <AppButton
              v-if="venue.status === 'pending_review'"
              :disabled="actingId === venue.id || !canApprove(venue)"
              :title="canApprove(venue) ? 'Approve listing' : 'Apply a cropped logo from owner files first'"
              @click="approveVenue(venue)"
            >
              <Check class="size-4" />
              Approve
            </AppButton>
            <AppButton
              v-if="venue.status === 'pending_review'"
              variant="secondary"
              :disabled="actingId === venue.id"
              @click="rejectTarget = venue"
            >
              <X class="size-4" />
              Reject
            </AppButton>
            <AppButton
              v-if="venue.status === 'published'"
              variant="secondary"
              :disabled="actingId === venue.id"
              @click="unpublishTarget = venue"
            >
              Unpublish
            </AppButton>
          </div>
        </div>

        <ListingChecklist
          v-if="venue.status === 'pending_review'"
          class="mt-4"
          variant="admin"
          :items="venue.listing.items"
        />
      </AppCard>

      <AppCard v-if="!venues.length">
        <EmptyState title="No venues in this queue" message="Try another filter or check back later." />
      </AppCard>

      <PaginationControls v-model:page="page" :last-page="lastPage" show-page-label />
    </div>

    <div
      v-if="rejectTarget"
      class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4"
      @click.self="rejectTarget = null"
    >
      <AppCard wrapper-class="w-full max-w-lg">
        <h3 class="text-xl font-black text-ink">Reject {{ rejectTarget.name }}</h3>
        <p class="mt-2 text-sm font-medium text-ink-muted">Optional note for the owner.</p>
        <textarea
          v-model="rejectNote"
          class="mt-4 h-28 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:border-ink-soft"
          placeholder="Tell the owner what to fix before resubmitting."
        />
        <div class="mt-4 flex flex-wrap gap-2">
          <AppButton :disabled="actingId === rejectTarget.id" @click="rejectVenue">
            Reject listing
          </AppButton>
          <AppButton variant="secondary" @click="rejectTarget = null">
            Cancel
          </AppButton>
        </div>
      </AppCard>
    </div>

    <div
      v-if="unpublishTarget"
      class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4"
      @click.self="unpublishTarget = null"
    >
      <AppCard wrapper-class="w-full max-w-lg">
        <h3 class="text-xl font-black text-ink">Unpublish {{ unpublishTarget.name }}</h3>
        <p class="mt-2 text-sm font-medium text-ink-muted">
          The venue will be hidden from customers. Optional note for the owner.
        </p>
        <textarea
          v-model="unpublishNote"
          class="mt-4 h-28 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:border-ink-soft"
          placeholder="Explain why the listing was taken offline."
        />
        <div class="mt-4 flex flex-wrap gap-2">
          <AppButton :disabled="actingId === unpublishTarget.id" @click="unpublishVenue">
            Unpublish listing
          </AppButton>
          <AppButton variant="secondary" @click="unpublishTarget = null">
            Cancel
          </AppButton>
        </div>
      </AppCard>
    </div>
  </AppShell>
</template>
