<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'

withDefaults(
  defineProps<{
    title: string
    description?: string
    badge?: string
    badgeTone?: 'blue' | 'green' | 'amber' | 'slate'
    compact?: boolean
  }>(),
  {
    badgeTone: 'blue',
    compact: false,
  },
)
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="flex min-w-0 items-start gap-3">
      <div v-if="$slots.leading" class="shrink-0">
        <slot name="leading" />
      </div>
      <div class="min-w-0">
        <AppBadge v-if="badge" :tone="badgeTone">{{ badge }}</AppBadge>
        <h1
          :class="[
            'font-black tracking-tight text-ink',
            badge ? 'mt-2' : '',
            compact ? 'text-2xl' : 'text-3xl md:text-4xl',
          ]"
        >
          {{ title }}
        </h1>
        <p v-if="description" class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted md:text-base">
          {{ description }}
        </p>
        <div v-if="$slots.meta" class="mt-2 flex flex-wrap items-center gap-2">
          <slot name="meta" />
        </div>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
