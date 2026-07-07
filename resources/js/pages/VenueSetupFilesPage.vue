<script setup lang="ts">
import { FileText, FileUp, Plus, Trash2 } from '@lucide/vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import VenueListingCard from '@/components/loyalty/VenueListingCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, apiErrorMessage, isVenueAccessDenied } from '@/lib/api'
import { VENUE_ACCESS_DENIED_MESSAGE } from '@/lib/venueWorkspace'
import { listingStatusLabel } from '@/lib/venueListing'
import { cn } from '@/lib/utils'
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
const isDragging = ref(false)
const dragDepth = ref(0)

const venueStatus = computed(() => venue.value?.status ?? 'draft')

const canUpload = computed(() => venueStatus.value !== 'pending_review')
const canDelete = computed(() => ['draft', 'rejected'].includes(venueStatus.value))

const lockReason = computed(() => {
  if (venueStatus.value === 'pending_review') {
    return 'Uploads are paused while Flotory reviews your listing. Contact support if you need to add files.'
  }

  return ''
})

const liveVenueNote = computed(() => {
  if (venueStatus.value !== 'published') {
    return ''
  }

  return 'Your venue is live. You can add new photos, but existing uploads cannot be removed — contact Flotory support if you need changes.'
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

function openFilePicker() {
  if (!canUpload.value || uploading.value) return
  fileInput.value?.click()
}

function onDragEnter(event: DragEvent) {
  event.preventDefault()
  if (!canUpload.value || uploading.value) return
  dragDepth.value += 1
  isDragging.value = true
}

function onDragLeave(event: DragEvent) {
  event.preventDefault()
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) {
    isDragging.value = false
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragDepth.value = 0
  isDragging.value = false
  if (!canUpload.value || uploading.value) return

  const selected = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []
  void uploadSelectedFiles(selected)
}

async function uploadSelectedFiles(selected: File[]) {
  if (!selected.length) return

  const images = selected.filter((file) => file.type.startsWith('image/'))
  if (!images.length) {
    error.value = 'Upload PNG, JPEG, WebP, or GIF images only — your logo and cover photo.'
    return
  }

  uploading.value = true
  error.value = ''

  let uploaded = 0

  for (const file of images) {
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

async function uploadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files ? Array.from(input.files) : []
  input.value = ''
  await uploadSelectedFiles(selected)
}

async function removeFile(file: VenueSetupFileRecord) {
  if (!canDelete.value) return

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
      title="Files"
      badge="Venue setup"
      :description="venue ? `Upload photos for ${venue.name}. We'll set up your logo and cover for the app listing and public page.` : 'Upload your venue photos.'"
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
      <AppCard v-if="venueStatus === 'pending_review'" wrapper-class="border-amber-200 bg-amber-50/80">
        <p class="text-sm font-bold text-amber-950">
          Uploads locked — {{ listingStatusLabel(venueStatus) }}
        </p>
        <p class="mt-2 text-sm font-medium text-amber-900/80">
          {{ lockReason }}
        </p>
      </AppCard>

      <AppCard v-else-if="liveVenueNote" wrapper-class="border-border bg-surface-muted/80">
        <p class="text-sm font-medium text-ink-muted">
          {{ liveVenueNote }}
        </p>
      </AppCard>

      <AppCard>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-black text-ink">Your uploads</h2>
            <p class="mt-1 text-sm text-ink-muted">
              PNG, JPEG, WebP, or GIF — up to 10 MB each. Include your logo and a wide cover or storefront photo.
            </p>
          </div>
          <input
            ref="fileInput"
            type="file"
            class="hidden"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            @change="uploadFiles"
          >
          <AppButton variant="secondary" :disabled="!canUpload || uploading" @click="openFilePicker">
            <FileUp class="size-4" />
            {{ uploading ? 'Uploading…' : 'Upload images' }}
          </AppButton>
        </div>

        <p v-if="error" class="mt-4 text-sm font-semibold text-danger">{{ error }}</p>

        <div
          class="mt-5 rounded-2xl border border-dashed px-4 py-6 transition"
          :class="cn(
            canUpload ? 'border-border bg-surface-muted/60' : 'border-border bg-surface-muted/40',
            canUpload && isDragging && 'border-accent bg-accent/5',
            canUpload && !uploading && 'cursor-pointer',
          )"
          @dragenter="onDragEnter"
          @dragleave="onDragLeave"
          @dragover.prevent
          @drop.prevent="onDrop"
          @click="canUpload && !files.length ? openFilePicker() : undefined"
        >
          <ul v-if="files.length" class="space-y-2">
            <li
              v-for="file in files"
              :key="file.id"
              class="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-muted border border-border">
                  <img v-if="file.is_image" :src="file.path" :alt="file.original_name" class="size-full object-cover">
                  <FileText v-else class="size-4 text-ink-muted" />
                </div>
                <div class="min-w-0">
                  <a
                    :href="file.path"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block truncate text-sm font-semibold text-ink hover:text-primary-soft"
                    @click.stop
                  >
                    {{ file.original_name }}
                  </a>
                  <p class="text-xs font-medium text-ink-muted">{{ formatSize(file.byte_size) }}</p>
                </div>
              </div>
              <AppButton v-if="canDelete" variant="ghost" size="sm" @click.stop="removeFile(file)">
                <Trash2 class="size-4" />
              </AppButton>
            </li>
          </ul>

          <div v-if="!files.length" class="py-4 text-center">
            <button
              v-if="canUpload"
              type="button"
              class="mx-auto grid size-14 place-items-center rounded-full border border-border bg-surface text-ink shadow-sm transition hover:border-accent/40 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="uploading"
              aria-label="Upload files"
              @click.stop="openFilePicker"
            >
              <Plus class="size-6" />
            </button>
            <p class="mt-4 text-sm font-medium text-ink-muted">
              <template v-if="canUpload">
                {{ isDragging ? 'Drop images to upload' : 'No uploads yet. Add your logo and cover photo to continue setup.' }}
              </template>
              <template v-else>No setup files on record for this venue.</template>
            </p>
            <p v-if="canUpload && !isDragging" class="mt-2 text-xs font-medium text-ink-muted/80">
              Click + or drag and drop files here
            </p>
          </div>

          <p
            v-else-if="canUpload"
            class="mt-4 border-t border-dashed border-border pt-4 text-center text-xs font-medium text-ink-muted"
          >
            {{ isDragging ? 'Drop files to upload' : 'Drag and drop more files here' }}
          </p>
        </div>
      </AppCard>
    </div>
  </AppShell>
</template>
