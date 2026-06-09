<script setup lang="ts">
import { computed } from 'vue'

import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    width?: 'md' | 'lg' | '3xl' | '6xl'
    paddingY?: '8' | '10'
  }>(),
  {
    width: 'md',
    paddingY: '8',
  },
)

const sectionClass = computed(() =>
  cn('relative mx-auto w-full', {
    md: 'max-w-md',
    lg: 'max-w-lg',
    '3xl': 'max-w-3xl',
    '6xl': 'max-w-6xl',
  }[props.width]),
)

const mainClass = computed(() =>
  cn(
    'relative min-h-screen overflow-x-hidden bg-marketing-page px-4 text-ink sm:py-12',
    props.paddingY === '10' ? 'py-10' : 'py-8',
  ),
)
</script>

<template>
  <main :class="mainClass">
    <div class="pointer-events-none absolute inset-0 marketing-page-glow" />
    <div class="pointer-events-none absolute -top-16 right-[10%] h-72 w-72 rounded-full bg-accent-soft/70 blur-[100px]" />
    <div class="pointer-events-none absolute top-[28%] -left-20 h-64 w-64 rounded-full bg-accent/15 blur-[90px]" />
    <section :class="sectionClass">
      <slot />
    </section>
  </main>
</template>
