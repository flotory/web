<script setup lang="ts">
import { computed } from 'vue'

import MarketingBackLink from '@/components/layout/MarketingBackLink.vue'
import MarketingFooter from '@/components/layout/MarketingFooter.vue'
import MarketingPageHeader from '@/components/layout/MarketingPageHeader.vue'
import { MARKETING_HOME_PATH } from '@/lib/brand'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    width?: 'md' | 'lg' | '3xl' | '6xl'
    paddingY?: '8' | '10'
    showHeader?: boolean
    showFooter?: boolean
    showBack?: boolean
    backFallback?: string
    backLabel?: string
  }>(),
  {
    width: 'md',
    paddingY: '8',
    showHeader: true,
    showFooter: true,
    showBack: true,
    backFallback: MARKETING_HOME_PATH,
    backLabel: 'Back',
  },
)

const contentWidthClass = computed(() =>
  cn('relative mx-auto w-full', {
    md: 'max-w-md',
    lg: 'max-w-lg',
    '3xl': 'max-w-3xl',
    '6xl': 'max-w-6xl',
  }[props.width]),
)

const mainClass = computed(() =>
  cn(
    'relative min-h-screen overflow-x-hidden bg-marketing-page text-ink',
    props.paddingY === '10' ? 'pb-10' : 'pb-8',
  ),
)

const contentSectionClass = computed(() =>
  cn('relative mx-auto mt-[40px] w-full max-w-6xl px-5 sm:px-6', props.paddingY === '10' ? 'pt-4' : 'pt-2'),
)
</script>

<template>
  <main :class="mainClass">
    <div class="pointer-events-none absolute inset-0 marketing-page-glow" />
    <div class="pointer-events-none absolute -top-16 right-[10%] h-72 w-72 rounded-full bg-accent-soft/70 blur-[100px]" />
    <div class="pointer-events-none absolute top-[28%] -left-20 h-64 w-64 rounded-full bg-accent/15 blur-[90px]" />

    <MarketingPageHeader v-if="showHeader" />

    <div :class="contentSectionClass">
      <div :class="[contentWidthClass, showBack && 'relative pl-[3.25rem] sm:pl-14']">
        <MarketingBackLink
          v-if="showBack"
          class="absolute left-0 top-0"
          :fallback-to="backFallback"
          :label="backLabel"
        />
        <slot />
      </div>
    </div>

    <div v-if="showFooter" class="relative mx-auto w-full max-w-5xl px-5 pb-12 pt-8 sm:px-6 sm:pb-16">
      <MarketingFooter />
    </div>
  </main>
</template>
