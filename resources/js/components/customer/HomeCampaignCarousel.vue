<script setup lang="ts">
import { RouterLink } from 'vue-router'

import HomeCampaignCard from '@/components/customer/HomeCampaignCard.vue'
import type { HomeCampaign, Venue } from '@/types'

defineProps<{
  campaigns: HomeCampaign[]
  venueById: Map<number, Venue>
}>()

/** Match mobile: ~86% / ~72% of content width (viewport minus 36px gutters). */
function cardWidthClass(index: number): string {
  return index === 0
    ? 'w-[min(calc((100vw-36px)*0.86),280px)]'
    : 'w-[min(calc((100vw-36px)*0.72),240px)]'
}
</script>

<template>
  <div>
    <div class="mb-3.5 flex items-center justify-between">
      <h2 class="text-lg font-extrabold text-ink">Active campaigns</h2>
      <span
        v-if="campaigns.length > 1"
        class="text-[13px] font-semibold text-ink-soft"
      >
        Swipe
      </span>
    </div>

    <div class="flex gap-3 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory">
      <RouterLink
        v-for="(campaign, index) in campaigns"
        :key="`${campaign.campaign_id}-${campaign.card_id}`"
        :to="{
          name: 'customer-card',
          params: { cardId: String(campaign.card_id) },
          query: { venue_id: String(campaign.venue_id) },
        }"
        class="shrink-0 snap-start transition hover:opacity-95"
        :class="cardWidthClass(index)"
      >
        <HomeCampaignCard
          :campaign="campaign"
          :featured="index === 0"
          :venue="venueById.get(campaign.venue_id)"
        />
      </RouterLink>
    </div>
  </div>
</template>
