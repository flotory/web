<script setup lang="ts">
import { computed } from 'vue'

import HomeRewardTicketCard from '@/components/customer/HomeRewardTicketCard.vue'
import { buildCardVenueRewardSlides } from '@/lib/cardVenueRewardSlides'
import type { MilestoneProgress, Reward, Venue } from '@/types'

const props = defineProps<{
  venue?: Venue | null
  milestones: MilestoneProgress[]
  stamps: number
  cardId: number
  venueId: number
  pendingUnlocks?: Array<{ unlock_id: number; reward: Reward }>
}>()

const slides = computed(() =>
  buildCardVenueRewardSlides(props.milestones, props.stamps, props.pendingUnlocks ?? []),
)

const readyCount = computed(() => slides.value.filter((slide) => slide.kind === 'ready').length)
</script>

<template>
  <div
    v-if="slides.length"
    class="mt-7"
  >
    <h2 class="mb-3 text-lg font-extrabold text-ink">
      {{ readyCount > 0 ? 'Rewards ready to claim' : 'Your rewards' }}
    </h2>
    <div
      class="flex gap-3 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory"
      :class="slides.length === 1 ? '' : ''"
    >
      <div
        v-for="slide in slides"
        :key="slide.id"
        class="w-[min(calc((100vw-36px)*0.86),320px)] shrink-0 snap-start"
      >
        <HomeRewardTicketCard
          v-if="slide.kind === 'ready'"
          variant="ready"
          :title="slide.milestone.title"
          :venue="venue"
          :image-reward="slide.milestone"
          :unlock-id="slide.unlockId"
        />
        <HomeRewardTicketCard
          v-else
          variant="next"
          :title="slide.milestone.title"
          :venue="venue"
          :image-reward="slide.milestone"
          :stamps-to-go="slide.stampsToGo"
          :card-id="cardId"
          :venue-id="venueId"
        />
      </div>
    </div>
  </div>
</template>
