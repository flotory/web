<script setup lang="ts">
import { computed } from 'vue'

import type { DesignPreviewPlatform } from '@/lib/designPreviewSpec'

const props = withDefaults(
  defineProps<{
    label: string
    platform?: DesignPreviewPlatform
    width: number
    height: number
    borderRadius?: number
    circular?: boolean
    imageSrc?: string | null
    objectFit?: 'cover' | 'contain'
    overlay?: 'wallet' | null
    mirrors?: string
    maxDisplayWidth?: number
  }>(),
  {
    borderRadius: 16,
    circular: false,
    objectFit: 'cover',
    overlay: null,
    imageSrc: null,
    mirrors: '',
    maxDisplayWidth: 200,
  },
)

const displayWidth = computed(() => {
  if (props.width <= props.maxDisplayWidth) {
    return props.width
  }

  return props.maxDisplayWidth
})

const displayHeight = computed(() => Math.round((props.height / props.width) * displayWidth.value))

const frameStyle = computed(() => ({
  width: `${displayWidth.value}px`,
  height: `${displayHeight.value}px`,
  borderRadius: props.circular ? '9999px' : `${props.borderRadius}px`,
}))
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <p class="text-sm font-bold text-ink">{{ label }}</p>
      <span
        v-if="platform"
        class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
        :class="platform === 'mobile' ? 'bg-lavender text-primary-soft' : 'bg-surface-muted text-ink-muted'"
      >
        {{ platform }}
      </span>
    </div>

    <div
      class="relative overflow-hidden border border-border bg-surface-muted shadow-sm"
      :style="frameStyle"
    >
      <img
        v-if="imageSrc"
        :src="imageSrc"
        :alt="label"
        class="size-full"
        :class="objectFit === 'contain' ? 'object-contain' : 'object-cover'"
      >

      <div
        v-else
        class="flex size-full items-center justify-center p-2 text-center text-[10px] font-semibold leading-snug text-ink-soft"
      >
        No image uploaded
      </div>

      <div
        v-if="overlay === 'wallet'"
        class="absolute inset-0 bg-[rgba(5,13,30,0.72)]"
      />

      <div
        v-if="overlay === 'wallet'"
        class="absolute inset-x-0 bottom-0 p-3"
      >
        <p class="text-sm font-bold text-white">Venue name</p>
        <p class="text-xs font-semibold text-white/75">3 / 10 stamps</p>
      </div>
    </div>

    <p v-if="mirrors" class="text-xs font-medium text-ink-soft">
      {{ width }}×{{ height }}px · {{ mirrors }}
    </p>
  </div>
</template>
