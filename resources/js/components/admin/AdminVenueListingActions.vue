<script setup lang="ts">
import { computed, ref } from 'vue'

import ListingChecklist from '@/components/loyalty/ListingChecklist.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import type { AdminManageVenue } from '@/composables/useAdminVenueManagement'
import { api, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'

const props = defineProps<{
  venue: AdminManageVenue
}>()

const emit = defineEmits<{
  updated: [venue: AdminManageVenue]
}>()

const acting = ref(false)
const rejectNote = ref('')
const unpublishNote = ref('')
const showReject = ref(false)
const showUnpublish = ref(false)

const canApproveListing = computed(() =>
  props.venue.status === 'pending_review'
  && Boolean(props.venue.listing?.ready_to_submit),
)

const isBranchPending = computed(() =>
  props.venue.is_branch
  && props.venue.location_status === 'pending_review',
)

async function reloadVenue(): Promise<AdminManageVenue | null> {
  try {
    const response = await api<{ venue: AdminManageVenue }>(`/admin/manage-venues/${props.venue.id}`)
    emit('updated', response.venue)
    return response.venue
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not refresh venue.'))
    return null
  }
}

async function approveListing() {
  acting.value = true
  try {
    await api(`/admin/venues/${props.venue.id}/approve`, { method: 'POST' })
    toast.success('Venue published.')
    await reloadVenue()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not approve venue.'))
  } finally {
    acting.value = false
  }
}

async function rejectListing() {
  acting.value = true
  try {
    await api(`/admin/venues/${props.venue.id}/reject`, {
      method: 'POST',
      body: { note: rejectNote.value.trim() || undefined },
    })
    toast.success('Venue returned to owner.')
    showReject.value = false
    rejectNote.value = ''
    await reloadVenue()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not reject venue.'))
  } finally {
    acting.value = false
  }
}

async function unpublishListing() {
  acting.value = true
  try {
    await api(`/admin/venues/${props.venue.id}/unpublish`, {
      method: 'POST',
      body: { note: unpublishNote.value.trim() || undefined },
    })
    toast.success('Venue unpublished.')
    showUnpublish.value = false
    unpublishNote.value = ''
    await reloadVenue()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not unpublish venue.'))
  } finally {
    acting.value = false
  }
}

async function approveBranch() {
  acting.value = true
  try {
    await api(`/admin/manage-venues/${props.venue.id}/approve-branch`, { method: 'POST' })
    toast.success('Branch location approved.')
    await reloadVenue()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not approve branch.'))
  } finally {
    acting.value = false
  }
}

async function rejectBranch() {
  acting.value = true
  try {
    await api(`/admin/manage-venues/${props.venue.id}/reject-branch`, {
      method: 'POST',
      body: { note: rejectNote.value.trim() || undefined },
    })
    toast.success('Branch rejected.')
    showReject.value = false
    rejectNote.value = ''
    await reloadVenue()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not reject branch.'))
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <AppCard v-if="isBranchPending || !venue.is_branch">
    <h2 class="text-xl font-black text-ink">Listing &amp; approval</h2>
    <p class="mt-2 text-sm font-medium text-ink-muted">
      <template v-if="venue.is_branch">
        Branch locations need Flotory approval before customers can join or tap NFC here.
      </template>
      <template v-else>
        Review the checklist, apply branding, then publish when ready.
      </template>
    </p>

    <div v-if="!venue.is_branch && venue.listing?.items?.length" class="mt-5">
      <ListingChecklist variant="admin" :items="venue.listing.items" />
    </div>

    <div class="mt-5 flex flex-wrap gap-2">
      <template v-if="isBranchPending">
        <AppButton :disabled="acting" @click="approveBranch">Approve branch</AppButton>
        <AppButton variant="secondary" :disabled="acting" @click="showReject = !showReject">
          Reject branch
        </AppButton>
      </template>

      <template v-else-if="venue.status === 'pending_review'">
        <AppButton :disabled="acting || !canApproveListing" @click="approveListing">
          Approve &amp; publish
        </AppButton>
        <AppButton variant="secondary" :disabled="acting" @click="showReject = !showReject">
          Reject listing
        </AppButton>
      </template>

      <template v-else-if="venue.status === 'published' && venue.is_primary">
        <AppButton variant="secondary" :disabled="acting" @click="showUnpublish = !showUnpublish">
          Unpublish
        </AppButton>
      </template>
    </div>

    <div v-if="showReject" class="mt-4 grid gap-2">
      <textarea
        v-model="rejectNote"
        rows="2"
        class="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-ink-soft"
        placeholder="Optional note for the owner"
      />
      <AppButton
        variant="secondary"
        :disabled="acting"
        @click="venue.is_branch ? rejectBranch() : rejectListing()"
      >
        Confirm rejection
      </AppButton>
    </div>

    <div v-if="showUnpublish" class="mt-4 grid gap-2">
      <textarea
        v-model="unpublishNote"
        rows="2"
        class="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-ink-soft"
        placeholder="Optional note for the owner"
      />
      <AppButton variant="secondary" :disabled="acting" @click="unpublishListing">
        Confirm unpublish
      </AppButton>
    </div>
  </AppCard>
</template>
