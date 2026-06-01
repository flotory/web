<script setup lang="ts">
import { computed } from 'vue'

import VenueLandingPreview from '@/components/loyalty/VenueLandingPreview.vue'

export type GuestCardMilestone = {
  id: number
  title: string
  description?: string | null
  image?: string | null
  image_thumb?: string | null
  required_stamps: number
  active?: boolean
  unlocked?: boolean
  claimed?: boolean
  isDraft?: boolean
}

const props = withDefaults(
  defineProps<{
    milestones: GuestCardMilestone[]
    stamps?: number
    venueName?: string | null
    animatingSlots?: number[]
    celebratingReward?: boolean
    editable?: boolean
    selectedMilestoneId?: number | null
    menuOpenMilestoneId?: number | null
    menuSaving?: boolean
  }>(),
  {
    stamps: 0,
    venueName: null,
    animatingSlots: () => [],
    celebratingReward: false,
    editable: false,
    selectedMilestoneId: null,
    menuOpenMilestoneId: null,
    menuSaving: false,
  },
)

const emit = defineEmits<{
  toggleMenu: [milestoneId: number]
  menuAction: [action: 'edit' | 'duplicate' | 'archive' | 'reactivate' | 'delete', milestoneId: number]
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
      active: milestone.active,
      isDraft: milestone.isDraft,
    })),
)
</script>

<template>
  <div class="space-y-4">
    <VenueLandingPreview
      v-if="landingMilestones.length"
      :milestones="landingMilestones"
      :stamps="stampCount"
      :animating-slots="animatingSlots"
      :celebrating-reward="celebratingReward"
      :editable="editable"
      :selected-milestone-id="selectedMilestoneId"
      :menu-open-milestone-id="menuOpenMilestoneId"
      :menu-saving="menuSaving"
      @toggle-menu="emit('toggleMenu', $event)"
      @menu-action="(action, id) => emit('menuAction', action, id)"
    />

    <p
      v-else
      class="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4 text-center text-sm text-slate-500"
    >
      Add a milestone to preview the guest card{{ venueName ? ` at ${venueName}` : '' }}.
    </p>
  </div>
</template>
