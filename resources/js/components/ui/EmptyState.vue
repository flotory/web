<script setup lang="ts">
import type { Component } from 'vue'

import AppCard from '@/components/ui/AppCard.vue'
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    icon?: Component
    title: string
    description?: string
    compact?: boolean
    bordered?: boolean
    bare?: boolean
  }>(),
  {
    description: '',
    compact: false,
    bordered: false,
    bare: false,
  },
)
</script>

<template>
  <component
    :is="bare ? 'div' : AppCard"
    :class="bare ? cn(compact && 'py-2', bordered && 'rounded-2xl border border-dashed border-border bg-surface-muted/80 p-4') : undefined"
    :wrapper-class="!bare ? cn(compact && 'py-6', bordered && 'border-dashed border-border bg-surface-muted/80') : undefined"
  >
    <div class="text-center">
      <div
        v-if="icon"
        :class="[
          'mx-auto grid place-items-center rounded-2xl bg-surface-muted text-ink-muted',
          compact ? 'size-12' : 'size-14',
          icon ? 'mt-0' : '',
        ]"
      >
        <component
          :is="icon"
          :class="compact ? 'size-6' : 'size-7'"
          :stroke-width="1.75"
          aria-hidden="true"
        />
      </div>
      <h2
        :class="[
          'font-black tracking-tight text-ink',
          icon ? 'mt-3' : '',
          compact ? 'text-base' : 'text-lg',
        ]"
      >
        {{ title }}
      </h2>
      <p v-if="description" class="mx-auto mt-2 max-w-sm text-sm font-semibold text-ink-muted">
        {{ description }}
      </p>
      <div v-if="$slots.default" class="mt-4 flex flex-wrap items-center justify-center gap-2">
        <slot />
      </div>
    </div>
  </component>
</template>
