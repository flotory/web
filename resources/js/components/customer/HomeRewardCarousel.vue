<script setup lang="ts">
import type { HomeRewardSlide } from '@/composables/useCustomerHome'

import HomeRewardTicketCard from '@/components/customer/HomeRewardTicketCard.vue'
import { rewardThumbUrl } from '@/lib/rewardMedia'

defineProps<{
  slides: HomeRewardSlide[]
}>()

const emit = defineEmits<{
  claimUnavailable: []
}>()
</script>

<template>
  <div class="flex gap-3 overflow-x-auto pb-1 pr-2 snap-x snap-mandatory">
    <div
      v-for="slide in slides"
      :key="slide.id"
      class="w-[min(calc((100vw-36px)*0.86),320px)] shrink-0 snap-start"
    >
      <HomeRewardTicketCard
        v-if="slide.kind === 'ready' && slide.item"
        variant="ready"
        :title="slide.item.reward.title"
        :venue="slide.item.customer.venue"
        :image-reward="slide.item.reward"
        :unlock-id="slide.item.unlock_id"
        @claim-unavailable="emit('claimUnavailable')"
      />
      <HomeRewardTicketCard
        v-else-if="slide.kind === 'next' && slide.card"
        variant="next"
        :title="slide.card.summary?.next_reward_title ?? 'Your next reward'"
        :venue="slide.card.venue"
        :image-reward="{ title: slide.card.summary?.next_reward_title ?? 'Reward', image: null, image_thumb: null }"
        :stamps-to-go="slide.card.summary?.stamps_to_next ?? null"
        :stamp-progress="{
          collected: slide.card.summary?.stamps ?? slide.card.stamps,
          target: slide.card.summary?.next_reward_stamps ?? slide.card.summary?.max_stamps ?? 10,
        }"
        :card-id="slide.card.id"
        :venue-id="slide.card.venue_id"
      />
    </div>
  </div>
</template>
