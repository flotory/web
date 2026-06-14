<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: string | number
  description: string
  trend?: number | null
}>()

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
  <div class="flex h-full min-h-[8.5rem] flex-col rounded-2xl border border-border/80 bg-surface p-5 shadow-sm shadow-border/40">
    <p class="text-sm font-semibold text-ink-muted">{{ label }}</p>
    <div class="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <p class="text-4xl font-black tabular-nums tracking-tight text-ink">
        {{ value }}
      </p>
      <p v-if="trendLabel" :class="trendClass">
        {{ trendLabel }}
      </p>
    </div>
    <p class="mt-auto pt-3 text-sm leading-snug text-ink-muted">
      {{ description }}
    </p>
    <p v-if="trendLabel" class="mt-1 text-xs font-medium text-ink-soft">vs previous 28 days</p>
  </div>
</template>
