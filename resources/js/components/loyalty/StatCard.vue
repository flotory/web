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
      return 'bg-amber-50 text-amber-600 ring-amber-100'
    case 'green':
      return 'bg-emerald-50 text-emerald-600 ring-emerald-100'
    case 'blue':
      return 'bg-blue-50 text-blue-600 ring-blue-100'
    default:
      return 'bg-violet-50 text-violet-600 ring-violet-100'
  }
})

const trendClass = computed(() => {
  if (props.trend === null || props.trend === undefined) {
    return ''
  }

  if (props.trend > 0) {
    return 'text-sm font-bold text-emerald-600'
  }

  if (props.trend < 0) {
    return 'text-sm font-bold text-red-500'
  }

  return 'text-sm font-bold text-slate-400'
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
  <div class="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40">
    <div
      :class="cn('grid size-11 shrink-0 place-items-center rounded-xl ring-1', toneClasses)"
      aria-hidden="true"
    >
      <component :is="icon" class="size-5" stroke-width="2.25" />
    </div>

    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-slate-500">{{ label }}</p>
      <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <p class="text-3xl font-black tabular-nums tracking-tight text-slate-950">
          {{ value }}
        </p>
        <p v-if="trendLabel" :class="trendClass">
          {{ trendLabel }}
        </p>
      </div>
      <p class="mt-1 text-xs font-medium text-slate-400">vs last month</p>
    </div>
  </div>
</template>
