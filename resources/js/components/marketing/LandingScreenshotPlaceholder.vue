<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    src?: string
    alt?: string
    sizeHint?: string
    minHeight?: string
    aspectRatio?: string
    dark?: boolean
  }>(),
  {
    minHeight: '12rem',
    dark: false,
    sizeHint: '',
    aspectRatio: '',
    src: '',
    alt: '',
  },
)

const boxStyle = computed(() => {
  if (props.src) {
    return undefined
  }

  if (props.aspectRatio) {
    return { aspectRatio: props.aspectRatio }
  }

  return { minHeight: props.minHeight }
})
</script>

<template>
  <div
    v-if="src"
    class="overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-sm"
    :style="boxStyle"
  >
    <img
      :src="src"
      :alt="alt || label"
      class="block w-full h-auto"
    >
  </div>

  <div
    v-else
    class="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-5 py-10 text-center"
    :class="dark ? 'border-white/30 bg-white/10' : 'border-border bg-[#e8e4dc]'"
    :style="boxStyle"
  >
    <p
      class="text-[10px] font-bold uppercase tracking-[0.14em]"
      :class="dark ? 'text-ink-soft' : 'text-ink-soft'"
    >
      Screenshot placeholder
    </p>
    <p
      class="max-w-md text-sm font-semibold leading-6"
      :class="dark ? 'text-ink-soft' : 'text-ink-muted'"
    >
      {{ label }}
    </p>
    <p
      v-if="sizeHint"
      class="max-w-md text-xs font-medium leading-5"
      :class="dark ? 'text-ink-soft/90' : 'text-ink-soft'"
    >
      {{ sizeHint }}
    </p>
  </div>
</template>
