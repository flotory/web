<script setup lang="ts">
import { FileText, FileUp, Trash2 } from '@lucide/vue'
import { onMounted, ref } from 'vue'

import ImageCropUpload from '@/components/ui/ImageCropUpload.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { api, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Venue } from '@/types'

export interface VenueSetupFileRecord {
  id: number
  kind: string
  original_name: string
  path: string
  mime_type: string
  byte_size: number
  is_image: boolean
  uploaded_at?: string
  uploader?: { name: string; email: string } | null
}

const props = defineProps<{
  venueId: number
}>()

const emit = defineEmits<{
  brandingUpdated: [venue: Venue]
}>()

const loading = ref(true)
const error = ref('')
const files = ref<VenueSetupFileRecord[]>([])
const requirements = ref({
  files_uploaded: false,
  file_count: 0,
  final_logo_applied: false,
  final_cover_applied: false,
})
const applying = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const logoCrop = ref<InstanceType<typeof ImageCropUpload> | null>(null)
const coverCrop = ref<InstanceType<typeof ImageCropUpload> | null>(null)
const cropSource = ref<{ url: string; name: string } | null>(null)

function fileUrl(path: string): string {
  return path.startsWith('http') ? path : path
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

async function loadFiles() {
  loading.value = true
  error.value = ''

  try {
    const response = await api<{
      files: VenueSetupFileRecord[]
      requirements: typeof requirements.value
    }>(`/admin/manage-venues/${props.venueId}/setup-files`)
    files.value = response.files
    requirements.value = response.requirements
  } catch (exception) {
    error.value = apiErrorMessage(exception, 'Could not load setup files.')
  } finally {
    loading.value = false
  }
}

function beginLogoCrop(file: VenueSetupFileRecord) {
  cropSource.value = { url: fileUrl(file.path), name: file.original_name }
  void logoCrop.value?.openWithUrl(fileUrl(file.path), file.original_name)
}

function beginCoverCrop(file: VenueSetupFileRecord) {
  cropSource.value = { url: fileUrl(file.path), name: file.original_name }
  void coverCrop.value?.openWithUrl(fileUrl(file.path), file.original_name)
}

async function applyLogo(file: File) {
  applying.value = true
  try {
    const body = new FormData()
    body.append('logo', file)
    const response = await api<{ venue: Venue }>(`/admin/manage-venues/${props.venueId}/logo`, {
      method: 'POST',
      body,
    })
    requirements.value.final_logo_applied = Boolean(response.venue.logo)
    toast.success('Logo applied for mobile and web.')
    emit('brandingUpdated', response.venue)
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not apply logo.'))
  } finally {
    applying.value = false
  }
}

async function applyCover(file: File) {
  applying.value = true
  try {
    const body = new FormData()
    body.append('cover', file)
    const response = await api<{ venue: Venue }>(`/admin/manage-venues/${props.venueId}/cover`, {
      method: 'POST',
      body,
    })
    requirements.value.final_cover_applied = Boolean(response.venue.cover_image)
    toast.success('Cover applied for mobile and web.')
    emit('brandingUpdated', response.venue)
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not apply cover.'))
  } finally {
    applying.value = false
  }
}

function openFilePicker() {
  if (uploading.value) return
  fileInput.value?.click()
}

async function uploadSelectedFiles(selected: File[]) {
  if (!selected.length) return

  uploading.value = true

  try {
    for (const file of selected) {
      const body = new FormData()
      body.append('file', file)
      await api(`/admin/manage-venues/${props.venueId}/setup-files`, {
        method: 'POST',
        body,
      })
    }

    toast.success(selected.length === 1 ? 'File uploaded.' : `${selected.length} files uploaded.`)
    await loadFiles()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not upload file.'))
  } finally {
    uploading.value = false
  }
}

async function onFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = input.files ? Array.from(input.files) : []
  input.value = ''
  await uploadSelectedFiles(selected)
}

async function deleteFile(fileId: number) {
  try {
    await api(`/admin/manage-venues/${props.venueId}/setup-files/${fileId}`, {
      method: 'DELETE',
    })
    toast.success('File removed.')
    await loadFiles()
  } catch (exception) {
    toast.error(apiErrorMessage(exception, 'Could not remove file.'))
  }
}

onMounted(loadFiles)
</script>

<template>
  <AppCard>
    <h2 class="text-xl font-black text-ink">Setup files &amp; branding</h2>
    <p class="mt-2 text-sm font-medium text-ink-muted">
      Upload logo/cover source files, crop them for the app, or apply directly from owner uploads.
    </p>

    <div class="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted/70 p-5">
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
        @change="onFileInputChange"
      >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-bold text-ink">Upload files</p>
          <p class="mt-1 text-xs font-medium text-ink-muted">Images, PDF, Word, or text — max 10 MB each.</p>
        </div>
        <AppButton variant="secondary" :disabled="uploading" @click="openFilePicker">
          <FileUp class="size-4" />
          {{ uploading ? 'Uploading…' : 'Add files' }}
        </AppButton>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
      <span class="rounded-full px-3 py-1" :class="requirements.files_uploaded ? 'bg-success-bg text-success-text' : 'bg-danger-soft text-danger'">
        Owner files {{ requirements.files_uploaded ? `✓ (${requirements.file_count})` : 'none yet' }}
      </span>
      <span class="rounded-full bg-surface-muted px-3 py-1 text-ink-muted">
        Final logo {{ requirements.final_logo_applied ? '✓ applied' : 'not applied' }}
      </span>
      <span class="rounded-full bg-surface-muted px-3 py-1 text-ink-muted">
        Final cover {{ requirements.final_cover_applied ? '✓ applied' : 'optional' }}
      </span>
    </div>

    <p v-if="error" class="mt-4 text-sm font-semibold text-danger">{{ error }}</p>
    <p v-else-if="loading" class="mt-4 text-sm font-medium text-ink-muted">Loading files…</p>

    <ul v-else-if="files.length" class="mt-5 space-y-3">
      <li
        v-for="file in files"
        :key="file.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-3"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div class="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface border border-border">
            <img v-if="file.is_image" :src="fileUrl(file.path)" :alt="file.original_name" class="size-full object-cover">
            <FileText v-else class="size-5 text-ink-muted" />
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-ink">{{ file.original_name }}</p>
            <p class="text-xs font-medium text-ink-muted">
              {{ formatSize(file.byte_size) }}
              <span v-if="file.uploader"> · {{ file.uploader.name }}</span>
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <a
            v-if="!file.is_image"
            :href="fileUrl(file.path)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex"
          >
            <AppButton variant="secondary" size="sm">Open</AppButton>
          </a>
          <AppButton
            v-if="file.is_image"
            variant="secondary"
            size="sm"
            :disabled="applying"
            @click="beginLogoCrop(file)"
          >
            Crop 512² logo
          </AppButton>
          <AppButton
            v-if="file.is_image"
            variant="secondary"
            size="sm"
            :disabled="applying"
            @click="beginCoverCrop(file)"
          >
            Crop 2:1 cover
          </AppButton>
          <AppButton
            variant="ghost"
            size="sm"
            :disabled="uploading"
            @click="deleteFile(file.id)"
          >
            <Trash2 class="size-4" />
          </AppButton>
        </div>
      </li>
    </ul>

    <p v-else class="mt-5 text-sm font-medium text-ink-muted">No setup files uploaded yet.</p>

    <ImageCropUpload ref="logoCrop" preset="square" modal-title="Crop venue logo (512×512)" @crop="applyLogo">
      <template #default><span class="sr-only">Logo crop</span></template>
    </ImageCropUpload>
    <ImageCropUpload ref="coverCrop" preset="cover" modal-title="Crop venue cover (1400×700)" @crop="applyCover">
      <template #default><span class="sr-only">Cover crop</span></template>
    </ImageCropUpload>
  </AppCard>
</template>
