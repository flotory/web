<script setup lang="ts">
import { Gift, Smartphone, Star } from '@lucide/vue'
import { computed, type Component } from 'vue'

import { buildScanLandingQuickFacts, type ScanLandingQuickFactIcon } from '@/lib/venueScanLanding'

const props = defineProps<{
  firstRewardStamps?: number | null
  milestoneCount: number
}>()

const facts = computed(() =>
  buildScanLandingQuickFacts({
    firstRewardStamps: props.firstRewardStamps,
    milestoneCount: props.milestoneCount,
  }),
)

const iconMap: Record<ScanLandingQuickFactIcon, Component> = {
  stamps: Star,
  rewards: Gift,
  join: Smartphone,
}
</script>

<template>
  <ul class="space-y-3">
    <li
      v-for="fact in facts"
      :key="fact.text"
      class="flex items-start gap-3 text-sm text-ink"
    >
      <component
        :is="iconMap[fact.icon]"
        class="mt-0.5 size-4 shrink-0 text-accent"
        aria-hidden="true"
      />
      <span class="font-medium leading-snug">{{ fact.text }}</span>
    </li>
  </ul>
</template>
