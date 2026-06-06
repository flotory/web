<script setup lang="ts">
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    padded?: boolean
    wrapperClass?: string
  }>(),
  {
    padded: true,
    wrapperClass: '',
  },
)
</script>

<template>
  <section :class="cn('rounded-[1.75rem] border border-border/70 bg-surface-elevated shadow-[0_1px_2px_rgba(8,18,51,0.04),0_12px_32px_rgba(8,18,51,0.06)]', padded && 'p-5 md:p-6', wrapperClass)">
    <slot />
  </section>
</template>
