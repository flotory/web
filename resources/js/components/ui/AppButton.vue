<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
  },
)

const attrs = useAttrs()

const classes = computed(() =>
  cn(
    'inline-flex cursor-pointer items-center justify-center rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50',
    {
      primary: 'bg-primary text-primary-text shadow-lg shadow-primary/15 hover:bg-primary-soft',
      secondary: 'bg-surface text-ink ring-1 ring-border hover:bg-surface-muted',
      ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
    }[props.variant],
    {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    }[props.size],
    attrs.class,
  ),
)
</script>

<template>
  <button :type="type" :class="classes" v-bind="{ ...attrs, class: undefined }">
    <slot />
  </button>
</template>
