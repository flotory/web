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
  <section :class="cn('rounded-[2rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/70', padded && 'p-5', wrapperClass)">
    <slot />
  </section>
</template>
