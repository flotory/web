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
  <section :class="cn('rounded-[2rem] border border-border/80 bg-surface shadow-sm shadow-border/70', padded && 'p-5', wrapperClass)">
    <slot />
  </section>
</template>
