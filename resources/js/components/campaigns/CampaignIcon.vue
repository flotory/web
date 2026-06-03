<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'

import { cn } from '@/lib/utils'
import type { CampaignIconTone } from '@/lib/campaignTemplates'

const props = withDefaults(
  defineProps<{
    icon: Component
    tone?: CampaignIconTone
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    tone: 'slate',
    size: 'md',
  },
)

const boxClass = computed(() =>
  cn(
    'grid shrink-0 place-items-center rounded-2xl ring-1',
    {
      sm: 'size-10',
      md: 'size-12',
      lg: 'size-14',
    }[props.size],
    {
      slate: 'bg-slate-100 text-slate-600 ring-slate-200/80',
      amber: 'bg-amber-100 text-amber-700 ring-amber-200/80',
      emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200/80',
      violet: 'bg-violet-100 text-violet-700 ring-violet-200/80',
      sky: 'bg-sky-100 text-sky-700 ring-sky-200/80',
      indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200/80',
    }[props.tone],
  ),
)

const iconClass = computed(() =>
  cn({
    sm: 'size-5',
    md: 'size-6',
    lg: 'size-7',
  }[props.size]),
)
</script>

<template>
  <div :class="boxClass">
    <component :is="icon" :class="iconClass" :stroke-width="1.75" aria-hidden="true" />
  </div>
</template>
