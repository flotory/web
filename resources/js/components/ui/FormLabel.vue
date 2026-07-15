<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{
  forId?: string
}>()
</script>

<template>
  <label :for="forId" :class="cn('text-sm font-bold text-ink-muted', $attrs.class)">
    <slot />
  </label>
</template>
