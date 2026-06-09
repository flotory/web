<script setup lang="ts">
import { FileText, FileUp, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VenueListingCard from '@/components/loyalty/VenueListingCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage, isVenueAccessDenied } from '@/lib/api'
import { VENUE_ACCESS_DENIED_MESSAGE } from '@/lib/venueWorkspace'
import { listingStatusLabel } from '@/lib/venueListing'
import { toast } from '@/lib/toast'
import type { Venue } from '@/types'

interface VenueSetupFileRecord {
  id: number
  kind: string
  original_name: string
  path: string
  mime_type: string
  byte_size: number
  is_image: boolean
  uploaded_at?: string
}

const route = useRoute()
const router = useRouter()
const venueId = computed(() => Number(route.params.id))

const venue = ref<Venue | null>(null)
const files = ref<VenueSetupFileRecord[]>([])
const loading = ref(true)
const uploading = ref(false)
const error = ref('')

const fileInput = ref<HTMLInputElement | null>(null)

const venueStatus = computed(() => venue.value?.status ?? 'draft')

const canEdit = computed(() => !['pending_review', 'published'].includes(venueStatus.value))

const lockReason = computed(() => {
  if (canEdit.value) return ''

  if (venueStatus.value === 'pending_review') {
    return 'Uploads are paused while Flotory reviews your listing. Contact support if you need to add files.'
  }

  if (venueStatus.value === 'published') {
    return 'This venue is live for customers. Contact Flotory if you need to add or replace setup files.'
  }

  return 'Uploads are not available for this venue right now.'
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function loadPage() {
  loading.value = true
  error.value = ''

  try {
    const [venueResponse, filesResponse] = await Promise.all([
      api<{ venue: Venue }>(`/venues/${venueId.value}`),
      api<{ files: VenueSetupFileRecord[] }>(`/venues/${venueId.value}/setup-files`),
    ])
    venue.value = venueResponse.venue
    files.value = filesResponse.files
  } catch (exception) {
    error.value = isVenueAccessDenied(exception)
      ? VENUE_ACCESS_DENIED_MESSAGE
      : apiErrorMessage(exception, 'Could not load setup files.')
  } finally {
    loading.value = false
  }
}

async function uploadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files ? Array.from(input.files) : []
  input.value = ''
  if (!selected.length) return

  uploading.value = true
  error.value = ''

  let uploaded = 0

  for (const file of selected) {
    try {
      const body = new FormData()
      body.append('file', file)

      const response = await api<{ file: VenueSetupFileRecord }>(`/venues/${venueId.value}/setup-files`, {
        method: 'POST',
        body,
      })

      files.value = [response.file, ...files.value.filter((item) => item.id !== response.file.id)]
      uploaded += 1
    } catch (exception) {
      error.value = apiErrorMessage(exception, `Could not upload ${file.name}.`)
      break
    }
  }

  if (uploaded > 0) {
    toast.success(uploaded === 1 ? 'File uploaded.' : `${uploaded} files uploaded.`)
  }

  uploading.value = false
}

async function removeFile(file: VenueSetupFileRecord) {
  if (!canEdit.value) return

  try {
    await api(`/venues/${venueId.value}/setup-files/${file.id}`, { method: 'DELETE' })
    files.value = files.value.filter((item) => item.id !== file.id)
    toast.success('File removed.')
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not remove file.'))
  }
}

onMounted(loadPage)
</script>

<template>
  <AppShell>
    <PageHeader
      title="Files & docs"
      badge="Venue setup"
      :description="venue ? `Upload anything that helps us set up ${venue.name} — logo, photos, menus, PDFs, and more.` : 'Upload files for your venue setup.'"
    >
      <template #actions>
        <AppButton variant="secondary" @click="router.push(`/my-venues/${venueId}/settings`)">
          Venue settings
        </AppButton>
      </template>
    </PageHeader>

    <div class="mb-5">
      <VenueListingCard :venue-id="venueId" />
    </div>

    <AppCard v-if="loading" wrapper-class="mb-5">
      <p class="text-sm font-bold text-ink-muted">Loading…</p>
    </AppCard>

    <AppCard v-else-if="error && !files.length" wrapper-class="mb-5">
      <p class="text-sm font-bold text-danger">{{ error }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton v-if="error === VENUE_ACCESS_DENIED_MESSAGE" @click="router.push('/my-venues')">
          Back to My Venues
        </AppButton>
        <AppButton v-else variant="secondary" @click="loadPage">Try again</AppButton>
      </div>
    </AppCard>

    <div v-else class="space-y-5">
      <AppCard>
        <AppBadge tone="blue">How it works</AppBadge>
        <p class="mt-3 text-sm font-medium leading-relaxed text-ink-muted">
          Upload all the files you have — logo, storefront photos, menus, brand guides, PDFs, anything useful.
          You do not need to prepare exact sizes. After you submit for review, the Flotory team will use these files to set up your account and mobile app branding.
        </p>
      </AppCard>

      <AppCard v-if="!canEdit" wrapper-class="border-amber-200 bg-amber-50/80">
        <p class="text-sm font-bold text-amber-950">
          Uploads locked — {{ listingStatusLabel(venueStatus) }}
        </p>
        <p class="mt-2 text-sm font-medium text-amber-900/80">
          {{ lockReason }}
        </p>
      </AppCard>

      <AppCard>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-black text-ink">Your files</h2>
            <p class="mt-1 text-sm text-ink-muted">
              Images, PDF, Word, or text — up to 10 MB each. Select multiple files at once.
            </p>
          </div>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,.pdf,.doc,.docx,.txt"
            @change="uploadFiles"
          >
          <AppButton variant="secondary" :disabled="!canEdit || uploading" @click="fileInput?.click()">
            <FileUp class="size-4" />
            {{ uploading ? 'Uploading…' : 'Upload files' }}
          </AppButton>
        </div>

        <p v-if="error" class="mt-4 text-sm font-semibold text-danger">{{ error }}</p>

        <ul v-if="files.length" class="mt-5 space-y-2">
          <li
            v-for="file in files"
            :key="file.id"
            class="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted px-3 py-2.5"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface border border-border">
                <img v-if="file.is_image" :src="file.path" :alt="file.original_name" class="size-full object-cover">
                <FileText v-else class="size-4 text-ink-muted" />
              </div>
              <div class="min-w-0">
                <a
                  :href="file.path"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block truncate text-sm font-semibold text-ink hover:text-primary-soft"
                >
                  {{ file.original_name }}
                </a>
                <p class="text-xs font-medium text-ink-muted">{{ formatSize(file.byte_size) }}</p>
              </div>
            </div>
            <AppButton v-if="canEdit" variant="ghost" size="sm" @click="removeFile(file)">
              <Trash2 class="size-4" />
            </AppButton>
          </li>
        </ul>

        <p v-else class="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted/60 px-4 py-8 text-center text-sm font-medium text-ink-muted">
          <template v-if="canEdit">No files yet. Upload your logo, menus, or any documents to continue setup.</template>
          <template v-else>No setup files on record for this venue.</template>
        </p>
      </AppCard>
    </div>
  </AppShell>
</template>
