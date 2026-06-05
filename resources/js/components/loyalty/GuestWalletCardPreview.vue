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
    menuSaving?: boolean
    variant?: 'compact' | 'prominent'
  }>(),
  {
    stamps: 0,
    venueName: null,
    animatingSlots: () => [],
    celebratingReward: false,
    editable: false,
    selectedMilestoneId: null,
    menuSaving: false,
    variant: 'compact',
  },
)

const emit = defineEmits<{
  menuAction: [action: 'edit' | 'archive' | 'reactivate' | 'delete', milestoneId: number]
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
  <div>
    <VenueLandingPreview
      v-if="landingMilestones.length"
      :milestones="landingMilestones"
      :stamps="stampCount"
      :animating-slots="animatingSlots"
      :celebrating-reward="celebratingReward"
      :editable="editable"
      :selected-milestone-id="selectedMilestoneId"
      :menu-saving="menuSaving"
      :variant="variant"
      @menu-action="(action, id) => emit('menuAction', action, id)"
    />

    <p
      v-else
      class="mx-auto max-w-xl rounded-2xl border border-dashed border-border bg-surface-muted/80 p-6 text-center text-sm text-ink-muted"
    >
      Add a milestone to preview the guest card{{ venueName ? ` at ${venueName}` : '' }}.
    </p>
  </div>
</template>
