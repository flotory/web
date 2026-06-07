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
    'grid shrink-0 place-items-center rounded-2xl',
    {
      sm: 'size-10',
      md: 'size-12',
      lg: 'size-14',
    }[props.size],
    {
      slate: 'bg-surface-muted text-ink-muted',
      amber: 'bg-accent-soft text-accent-active',
      emerald: 'bg-success-bg text-success-text',
      violet: 'bg-accent-soft text-primary',
      sky: 'bg-surface-muted text-ink-muted',
      indigo: 'bg-accent-soft text-primary',
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
