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
      slate: 'bg-surface-muted text-ink-muted ring-border/80',
      amber: 'bg-accent-soft text-accent-active ring-accent-border/80',
      emerald: 'bg-success-bg text-success-text ring-success-border/80',
      violet: 'bg-accent-soft text-primary ring-accent-border/80',
      sky: 'bg-surface-muted text-ink-muted ring-border/80',
      indigo: 'bg-accent-soft text-primary ring-accent-border/80',
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
