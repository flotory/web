<script setup lang="ts">
import { Check, Circle, Clock3, Send } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api, apiErrorMessage } from '@/lib/api'
import {
  listingItemPath,
  listingStatusLabel,
  listingStatusTone,
  type VenueListingSnapshot,
} from '@/lib/venueListing'
import { toast } from '@/lib/toast'

const props = defineProps<{
  venueId: number
}>()

const emit = defineEmits<{
  updated: []
}>()

const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const listing = ref<VenueListingSnapshot | null>(null)

const completedCount = computed(() => listing.value?.items.filter((item) => item.complete).length ?? 0)
const totalCount = computed(() => listing.value?.items.length ?? 0)
const showCard = computed(() => listing.value && listing.value.status !== 'published')

async function loadListing() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{ listing: VenueListingSnapshot }>(`/venues/${props.venueId}/listing`)
    listing.value = response.listing
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load listing status.')
  } finally {
    loading.value = false
  }
}

async function submitForReview() {
  if (!listing.value?.can_submit) {
    return
  }

  submitting.value = true
  error.value = ''

  try {
    const response = await api<{ listing: VenueListingSnapshot }>(`/venues/${props.venueId}/listing/submit`, {
      method: 'POST',
    })
    listing.value = response.listing
    toast.success('Submitted for review. We will notify you once it is approved.')
    emit('updated')
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not submit for review.')
  } finally {
    submitting.value = false
  }
}

onMounted(loadListing)

watch(() => props.venueId, loadListing)
</script>

<template>
  <AppCard v-if="showCard && !loading" wrapper-class="mb-5 border-border/80 bg-surface/95">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <AppBadge :tone="listing ? listingStatusTone(listing.status) : 'slate'">
          {{ listing ? listingStatusLabel(listing.status) : 'Listing' }}
        </AppBadge>
        <h2 class="mt-3 text-xl font-black text-ink">
          {{ listing?.status === 'pending_review' ? 'Listing under review' : 'Complete your public listing' }}
        </h2>
        <p class="mt-2 max-w-2xl text-sm font-medium text-ink-muted">
          <template v-if="listing?.status === 'pending_review'">
            Your venue is hidden from customers until Flotory approves it. You can still use the scanner and dashboard.
          </template>
          <template v-else-if="listing?.status === 'rejected'">
            {{ listing.review_note || 'Please update your venue details and submit again.' }}
          </template>
          <template v-else>
            Finish these steps, then submit for approval. Customers will only see your venue after approval.
          </template>
        </p>
      </div>
      <div v-if="listing && listing.status !== 'pending_review'" class="text-right">
        <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Progress</p>
        <p class="mt-1 text-2xl font-black text-ink">{{ completedCount }}/{{ totalCount }}</p>
      </div>
    </div>

    <ul v-if="listing && listing.status !== 'pending_review'" class="mt-5 space-y-3">
      <li
        v-for="item in listing.items"
        :key="item.key"
        class="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-muted/70 px-4 py-3"
      >
        <div class="flex min-w-0 items-start gap-3">
          <component
            :is="item.complete ? Check : Circle"
            class="mt-0.5 size-4 shrink-0"
            :class="item.complete ? 'text-success' : 'text-ink-soft'"
          />
          <div class="min-w-0">
            <p class="text-sm font-bold text-ink">{{ item.label }}</p>
            <p v-if="!item.complete" class="mt-1 text-xs font-medium text-ink-muted">{{ item.hint }}</p>
          </div>
        </div>
        <RouterLink
          v-if="!item.complete"
          :to="listingItemPath(venueId, item.key)"
          class="shrink-0 text-xs font-bold text-primary-soft hover:text-primary"
        >
          Add
        </RouterLink>
      </li>
    </ul>

    <div v-if="listing?.status === 'pending_review'" class="mt-5 flex items-center gap-3 rounded-2xl bg-lavender px-4 py-3 text-sm font-semibold text-primary-soft">
      <Clock3 class="size-4 shrink-0" />
      Waiting for admin approval. Scanner and rewards still work for your team.
    </div>

    <p v-if="error" class="mt-4 rounded-2xl bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">{{ error }}</p>

    <div v-if="listing?.can_submit" class="mt-5">
      <AppButton :disabled="submitting" @click="submitForReview">
        <Send class="size-4" />
        {{ submitting ? 'Submitting…' : 'Submit for listing' }}
      </AppButton>
    </div>
  </AppCard>
</template>
