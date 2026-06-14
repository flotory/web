<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'

import { cn } from '@/lib/utils'

const props = defineProps<{
  label: string
  value: string | number
  trend?: number | null
  icon: Component
  tone?: 'purple' | 'amber' | 'green' | 'blue'
}>()

const toneClasses = computed(() => {
  switch (props.tone ?? 'purple') {
    case 'amber':
      return 'bg-accent-soft text-accent-active'
    case 'green':
      return 'bg-success-bg text-success-text'
    case 'blue':
      return 'bg-accent-soft text-primary'
    default:
      return 'bg-accent-soft text-primary'
  }
})

const trendClass = computed(() => {
  if (props.trend === null || props.trend === undefined) {
    return ''
  }

  if (props.trend > 0) {
    return 'text-sm font-bold text-success'
  }

  if (props.trend < 0) {
    return 'text-sm font-bold text-danger'
  }

  return 'text-sm font-bold text-ink-soft'
})

const trendLabel = computed(() => {
  if (props.trend === null || props.trend === undefined) {
    return null
  }

  const absolute = Math.abs(props.trend)
  const formatted = Number.isInteger(absolute) ? `${absolute}` : absolute.toFixed(1)

  if (props.trend > 0) {
    return `↑ ${formatted}%`
  }

  if (props.trend < 0) {
    return `↓ ${formatted}%`
  }

  return '— 0%'
})
</script>

<template>
  <div class="flex gap-4 rounded-2xl border border-border/70 bg-surface-elevated p-4 shadow-[0_1px_2px_rgba(8,18,51,0.04),0_8px_24px_rgba(8,18,51,0.05)]">
    <div
      :class="cn('grid size-11 shrink-0 place-items-center rounded-xl', toneClasses)"
      aria-hidden="true"
    >
      <component :is="icon" class="size-5" stroke-width="2.25" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-ink-muted">{{ label }}</p>
      <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p class="text-3xl font-black tabular-nums tracking-tight text-ink">
          {{ value }}
        </p>
        <p v-if="trendLabel" :class="trendClass">
          {{ trendLabel }}
        </p>
      </div>
      <p class="mt-1 text-xs font-medium text-ink-soft">vs previous 28 days</p>
    </div>
  </div>
</template>
