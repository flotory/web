<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: 'error' | 'success' | 'info'
  }>(),
  {
    variant: 'error',
  },
)

const variantClass = {
  error: 'bg-danger-soft text-danger',
  success: 'bg-success-bg text-success-text',
  info: 'bg-surface-muted text-ink-muted',
} as const
</script>

<template>
  <div :class="cn('rounded-2xl p-3 text-sm font-semibold', variantClass[props.variant], $attrs.class)">
    <slot />
  </div>
</template>
