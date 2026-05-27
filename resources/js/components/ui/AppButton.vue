<script setup lang="ts">
import { computed } from 'vue'

import { cn } from '@/lib/utils'

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

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center rounded-full font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    {
      primary: 'bg-slate-950 text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800',
      secondary: 'bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-50',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950',
    }[props.variant],
    {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    }[props.size],
  ),
)
</script>

<template>
  <button :type="type" :class="classes">
    <slot />
  </button>
</template>
