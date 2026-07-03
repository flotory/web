<script setup lang="ts">
import { RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import MarketingBackLink from '@/components/layout/MarketingBackLink.vue'
import { MARKETING_HOME_PATH } from '@/lib/brand'

withDefaults(
  defineProps<{
    backFallback?: string
    backLabel?: string
    logoSize?: 'md' | 'lg'
    headerClass?: string
  }>(),
  {
    backFallback: MARKETING_HOME_PATH,
    backLabel: 'Back',
    logoSize: 'lg',
    headerClass: 'mb-6',
  },
)
</script>

<template>
  <div :class="headerClass">
    <div class="flex items-center gap-3 sm:gap-4">
      <MarketingBackLink :fallback-to="backFallback" :label="backLabel" />
      <RouterLink :to="MARKETING_HOME_PATH" class="inline-flex min-w-0" aria-label="Flotory home">
        <FlotoryLogo :size="logoSize" />
      </RouterLink>
    </div>
  </div>
</template>
