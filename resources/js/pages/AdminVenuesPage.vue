<script setup lang="ts">
import { Check, Store, X } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { formatShortDate } from '@/lib/formatDate'
import { listingStatusLabel, listingStatusTone, type VenueListingSnapshot } from '@/lib/venueListing'
import { toast } from '@/lib/toast'

type ReviewVenue = {
  id: number
  name: string
  slug: string
  category?: string | null
  address?: string | null
  status: VenueListingSnapshot['status']
  review_note?: string | null
  submitted_at?: string | null
  published_at?: string | null
  active_rewards_count: number
  customers_count: number
  owner?: { id: number; name: string; email: string } | null
  listing: VenueListingSnapshot
}

const loading = ref(true)
const actingId = ref<number | null>(null)
const error = ref('')
const venues = ref<ReviewVenue[]>([])
const statusFilter = ref<'pending_review' | 'published' | 'draft' | 'rejected' | ''>('pending_review')
const rejectNote = ref('')
const rejectTarget = ref<ReviewVenue | null>(null)

const title = computed(() => {
  if (statusFilter.value === 'pending_review') return 'Pending review'
  if (statusFilter.value === 'published') return 'Published venues'
  if (statusFilter.value === 'rejected') return 'Rejected listings'
  return 'All venue listings'
})

async function loadVenues() {
  loading.value = true
  error.value = ''

  try {
    const params = new URLSearchParams()
    if (statusFilter.value) {
      params.set('status', statusFilter.value)
    }

    const response = await api<{ venues: ReviewVenue[] }>(`/admin/venues?${params}`)
    venues.value = response.venues
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load venues.')
  } finally {
    loading.value = false
  }
}

async function approveVenue(venue: ReviewVenue) {
  actingId.value = venue.id

  try {
    await api(`/admin/venues/${venue.id}/approve`, { method: 'POST' })
    toast.success(`${venue.name} is now live for customers.`)
    await loadVenues()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not approve venue.'))
  } finally {
    actingId.value = null
  }
}

async function rejectVenue() {
  if (!rejectTarget.value) return

  actingId.value = rejectTarget.value.id

  try {
    await api(`/admin/venues/${rejectTarget.value.id}/reject`, {
      method: 'POST',
      body: { note: rejectNote.value || undefined },
    })
    toast.success('Venue sent back to owner with feedback.')
    rejectTarget.value = null
    rejectNote.value = ''
    await loadVenues()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not reject venue.'))
  } finally {
    actingId.value = null
  }
}

async function unpublishVenue(venue: ReviewVenue) {
  actingId.value = venue.id

  try {
    await api(`/admin/venues/${venue.id}/unpublish`, { method: 'POST' })
    toast.success(`${venue.name} is hidden from customers.`)
    await loadVenues()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not unpublish venue.'))
  } finally {
    actingId.value = null
  }
}

onMounted(loadVenues)
watch(statusFilter, loadVenues)
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
        <AppButton :variant="statusFilter === 'pending_review' ? 'primary' : 'secondary'" @click="statusFilter = 'pending_review'">
          Pending
        </AppButton>
        <AppButton :variant="statusFilter === 'published' ? 'primary' : 'secondary'" @click="statusFilter = 'published'">
          Published
        </AppButton>
        <AppButton :variant="statusFilter === 'draft' ? 'primary' : 'secondary'" @click="statusFilter = 'draft'">
          Draft
        </AppButton>
        <AppButton :variant="statusFilter === 'rejected' ? 'primary' : 'secondary'" @click="statusFilter = 'rejected'">
          Rejected
        </AppButton>
      </div>
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
          </div>

          <div class="flex flex-wrap gap-2">
            <AppButton
              v-if="venue.status === 'pending_review'"
              :disabled="actingId === venue.id"
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
              @click="unpublishVenue(venue)"
            >
              Unpublish
            </AppButton>
          </div>
        </div>

        <ul v-if="venue.status === 'pending_review'" class="mt-4 grid gap-2 sm:grid-cols-2">
          <li
            v-for="item in venue.listing.items"
            :key="item.key"
            class="rounded-xl bg-surface-muted px-3 py-2 text-sm font-medium"
            :class="item.complete ? 'text-ink' : 'text-danger'"
          >
            {{ item.complete ? '✓' : '○' }} {{ item.label }}
          </li>
        </ul>
      </AppCard>

      <AppCard v-if="!venues.length">
        <EmptyState title="No venues in this queue" message="Try another filter or check back later." />
      </AppCard>
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
          class="mt-4 h-28 w-full rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm font-medium outline-none focus:border-ink-soft focus:bg-surface"
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
  </AppShell>
</template>
