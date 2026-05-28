<script setup lang="ts">
import { computed } from 'vue'

import { FLOTORY_APP_NAME, FLOTORY_ICON_192, FLOTORY_ICON_512 } from '@/lib/brand'

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg'
    showWordmark?: boolean
    inverted?: boolean
  }>(),
  {
    size: 'md',
    showWordmark: true,
    inverted: false,
  },
)

const iconClass = computed(() => {
  if (props.size === 'sm') return 'size-7'
  if (props.size === 'lg') return 'size-11'
  return 'size-9'
})

const iconSrc = computed(() => (props.size === 'lg' ? FLOTORY_ICON_512 : FLOTORY_ICON_192))

const wordmarkClass = computed(() => {
  const base = 'font-black tracking-tight'
  const tone = props.inverted ? 'text-white' : 'text-slate-950'
  const scale = props.size === 'lg' ? 'text-xl' : props.size === 'sm' ? 'text-base' : 'text-lg'
  return `${base} ${tone} ${scale}`
})
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <img
      :src="iconSrc"
      :alt="`${FLOTORY_APP_NAME} logo`"
      :class="[iconClass, 'shrink-0 rounded-[22%] object-contain']"
      width="44"
      height="44"
      decoding="async"
    >
    <span v-if="showWordmark" :class="wordmarkClass">{{ FLOTORY_APP_NAME }}</span>
  </span>
</template>
