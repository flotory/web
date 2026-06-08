<script setup lang="ts">
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { computed, nextTick, onUnmounted, ref } from 'vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { canvasToCroppedFile } from '@/lib/cropImageToFile'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  imagePreset,
  type ImagePresetId,
} from '@/lib/imagePresets'
import { toast } from '@/lib/toast'

const props = withDefaults(
  defineProps<{
    preset?: ImagePresetId
    disabled?: boolean
    modalTitle?: string
  }>(),
  {
    preset: 'square',
    disabled: false,
    modalTitle: 'Crop image',
  },
)

const emit = defineEmits<{
  crop: [file: File]
}>()

const presetConfig = computed(() => imagePreset(props.preset))

const fileInput = ref<HTMLInputElement | null>(null)
const cropImage = ref<HTMLImageElement | null>(null)
const dialogOpen = ref(false)
const sourceName = ref('')
const objectUrl = ref<string | null>(null)
const saving = ref(false)

let cropper: Cropper | null = null

function revokeSourceUrl() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = null
  }
}

function destroyCropper() {
  cropper?.destroy()
  cropper = null
}

function closeDialog() {
  destroyCropper()
  revokeSourceUrl()
  dialogOpen.value = false
  sourceName.value = ''
  saving.value = false
}

function openPicker() {
  if (props.disabled) {
    return
  }
  fileInput.value?.click()
}

async function initCropper() {
  await nextTick()

  if (!cropImage.value || !objectUrl.value) {
    return
  }

  destroyCropper()

  cropper = new Cropper(cropImage.value, {
    aspectRatio: presetConfig.value.aspectRatio,
    viewMode: 1,
    dragMode: 'move',
    autoCropArea: 0.92,
    responsive: true,
    restore: false,
    guides: true,
    center: true,
    highlight: false,
    cropBoxMovable: true,
    cropBoxResizable: true,
    toggleDragModeOnDblclick: false,
  })
}

async function openWithUrl(url: string, filename: string) {
  if (props.disabled) {
    return
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('fetch failed')
    }

    const blob = await response.blob()
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(blob.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
      toast.error('Only image files can be cropped for the app.')
      return
    }

    revokeSourceUrl()
    sourceName.value = filename
    objectUrl.value = URL.createObjectURL(blob)
    dialogOpen.value = true
  } catch {
    toast.error('Could not open this file for cropping.')
  }
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  const config = presetConfig.value

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
    toast.error('Use a JPG, PNG, WebP, or GIF image. iPhone HEIC photos must be converted first.')
    return
  }

  if (file.size > config.maxFileSizeBytes) {
    toast.error('Image must be 5 MB or smaller.')
    return
  }

  revokeSourceUrl()
  sourceName.value = file.name
  objectUrl.value = URL.createObjectURL(file)
  dialogOpen.value = true
}

function onCropImageLoad() {
  void initCropper()
}

async function confirmCrop() {
  if (!cropper || saving.value) {
    return
  }

  saving.value = true

  try {
    const canvas = cropper.getCroppedCanvas({
      width: presetConfig.value.outputWidth,
      height: presetConfig.value.outputHeight,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    })

    if (!canvas) {
      throw new Error('Could not crop image.')
    }

    const file = await canvasToCroppedFile(canvas, presetConfig.value, sourceName.value)
    emit('crop', file)
    closeDialog()
  } catch {
    toast.error('Could not crop image. Try another file.')
    saving.value = false
  }
}

onUnmounted(() => {
  closeDialog()
})

defineExpose({ openPicker, openWithUrl })
</script>

<template>
  <input
    ref="fileInput"
    type="file"
    class="hidden"
    :accept="presetConfig.accept"
    :disabled="disabled"
    @change="onFileChange"
  >

  <slot :open="openPicker" />

  <Teleport to="body">
    <div
      v-if="dialogOpen"
      class="fixed inset-0 z-50 flex items-end justify-center bg-primary/60 p-4 backdrop-blur-sm sm:items-center"
      @click.self="closeDialog"
    >
      <AppCard wrapper-class="flex w-full max-w-lg flex-col overflow-hidden border-border bg-surface p-0">
        <div class="border-b border-border px-5 py-4 sm:px-6">
          <h2 class="text-xl font-black text-ink">{{ modalTitle }}</h2>
          <p class="mt-1 text-sm text-ink-muted">{{ presetConfig.helpText }}</p>
        </div>

        <div class="image-crop-stage">
          <img
            v-if="objectUrl"
            ref="cropImage"
            :src="objectUrl"
            alt=""
            class="image-crop-source"
            @load="onCropImageLoad"
          >
        </div>

        <div class="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <AppButton type="button" variant="ghost" :disabled="saving" @click="closeDialog">
            Cancel
          </AppButton>
          <AppButton type="button" :disabled="saving" @click="confirmCrop">
            {{ saving ? 'Saving…' : 'Use image' }}
          </AppButton>
        </div>
      </AppCard>
    </div>
  </Teleport>
</template>

<style scoped>
.image-crop-stage {
  position: relative;
  min-height: min(60vh, 28rem);
  max-height: min(60vh, 28rem);
  overflow: hidden;
  background-color: var(--flotory-primary);
  background-image:
    radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.05) 1px, transparent 0),
    linear-gradient(165deg, var(--flotory-primary-soft) 0%, var(--flotory-primary) 72%, var(--flotory-primary-soft) 100%);
  background-size:
    18px 18px,
    100% 100%;
}

.image-crop-source {
  display: block;
  max-height: min(60vh, 28rem);
  max-width: 100%;
}

:deep(.cropper-container) {
  width: 100% !important;
}

:deep(.cropper-bg) {
  background-image: none !important;
  background-color: transparent !important;
}

:deep(.cropper-modal) {
  background-color: var(--flotory-primary);
  opacity: 0.68;
}

:deep(.cropper-view-box) {
  outline: 2px solid var(--flotory-accent);
  outline-color: color-mix(in srgb, var(--flotory-accent) 90%, transparent);
  border-radius: 2px;
}

:deep(.cropper-face) {
  border-radius: 0;
  background-color: transparent;
}

:deep(.cropper-line),
:deep(.cropper-point) {
  background-color: var(--flotory-accent);
}

:deep(.cropper-point.point-se::before) {
  background-color: var(--flotory-accent);
}

:deep(.cropper-dashed) {
  border-color: rgb(255 255 255 / 0.38);
  opacity: 0.7;
}

:deep(.cropper-center::before),
:deep(.cropper-center::after) {
  background-color: rgb(255 255 255 / 0.5);
}
</style>
