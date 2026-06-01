<script setup lang="ts">
import { computed } from 'vue'

import VenueLandingPreview from '@/components/loyalty/VenueLandingPreview.vue'
import AppCard from '@/components/ui/AppCard.vue'

export type GuestCardMilestone = {
  id: number
  title: string
  description?: string | null
  image?: string | null
  image_thumb?: string | null
  required_stamps: number
  unlocked?: boolean
  claimed?: boolean
  isDraft?: boolean
}

const props = withDefaults(
  defineProps<{
    milestones: GuestCardMilestone[]
    stamps?: number
    venueName?: string | null
    showStampQr?: boolean
    animatingSlots?: number[]
    celebratingReward?: boolean
    editable?: boolean
    selectedMilestoneId?: number | null
  }>(),
  {
    stamps: 0,
    venueName: null,
    showStampQr: false,
    animatingSlots: () => [],
    celebratingReward: false,
    editable: false,
    selectedMilestoneId: null,
  },
)

const emit = defineEmits<{
  selectMilestone: [milestoneId: number]
}>()

const stampCount = computed(() => props.stamps ?? 0)

const landingMilestones = computed(() =>
  [...props.milestones]
    .sort((a, b) => a.required_stamps - b.required_stamps)
    .map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description ?? null,
      image: milestone.image ?? null,
      image_thumb: milestone.image_thumb ?? null,
      required_stamps: milestone.required_stamps,
    })),
)
</script>

<template>
  <div class="space-y-4">
    <AppCard
      v-if="showStampQr"
      wrapper-class="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
      :padded="false"
    >
      <h2 class="text-center text-lg font-black text-slate-950">Add a stamp</h2>
      <p class="mt-1 text-center text-sm text-slate-500">
        Staff scan the guest QR on Wallet. Rewards are claimed from the Rewards tab.
      </p>
      <div class="mt-4 flex justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <div class="grid size-[200px] place-items-center rounded-2xl bg-white ring-1 ring-slate-200">
          <span class="text-xs font-semibold text-slate-400">Guest QR</span>
        </div>
      </div>
    </AppCard>

    <VenueLandingPreview
      v-if="landingMilestones.length"
      :milestones="landingMilestones"
      :stamps="stampCount"
      :animating-slots="animatingSlots"
      :celebrating-reward="celebratingReward"
      :editable="editable"
      :selected-milestone-id="selectedMilestoneId"
      @select-milestone="emit('selectMilestone', $event)"
    />

    <p
      v-else
      class="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-center text-sm text-slate-500"
    >
      Add a milestone to preview the guest card{{ venueName ? ` at ${venueName}` : '' }}.
    </p>
  </div>
</template>
