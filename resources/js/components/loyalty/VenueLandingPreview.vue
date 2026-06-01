<script setup lang="ts">
import { computed } from 'vue'

import type { VenueLandingPayload } from '@/lib/onboarding'

const props = defineProps<{
  milestones: VenueLandingPayload['milestones']
  stamps?: number
  animatingSlots?: number[]
  celebratingReward?: boolean
  editable?: boolean
  selectedMilestoneId?: number | null
}>()

const emit = defineEmits<{
  selectMilestone: [milestoneId: number]
}>()

const stampCount = computed(() => props.stamps ?? 0)

const sortedMilestones = computed(() =>
  [...props.milestones].sort((a, b) => a.required_stamps - b.required_stamps),
)

const milestoneByPosition = computed(() => {
  const map = new Map<number, VenueLandingPayload['milestones'][number]>()
  for (const milestone of sortedMilestones.value) {
    map.set(milestone.required_stamps, milestone)
  }
  return map
})

const maxStamps = computed(() => {
  const last = sortedMilestones.value.at(-1)?.required_stamps
  return last && last > 0 ? last : 10
})

const milestonePositions = computed(() => new Set(sortedMilestones.value.map((m) => m.required_stamps)))

const slots = computed(() =>
  Array.from({ length: maxStamps.value }, (_, index) => {
    const position = index + 1
    const milestone = milestoneByPosition.value.get(position) ?? null
    return {
      position,
      filled: position <= stampCount.value,
      isReward: milestonePositions.value.has(position),
      milestone,
    }
  }),
)

function onRewardSlotClick(position: number) {
  if (!props.editable) {
    return
  }

  const milestone = milestoneByPosition.value.get(position)
  if (milestone) {
    emit('selectMilestone', milestone.id)
  }
}

function slotRingClass(slot: { position: number; isReward: boolean; milestone: VenueLandingPayload['milestones'][number] | null }): string {
  if (!props.editable || !slot.isReward || !slot.milestone) {
    return ''
  }

  if (props.selectedMilestoneId === slot.milestone.id) {
    return 'ring-2 ring-indigo-500 ring-offset-2'
  }

  return 'ring-1 ring-rose-200 hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1'
}
</script>

<template>
  <article class="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)]">
    <div class="flex items-start gap-4">
      <div class="shrink-0">
        <p class="text-4xl font-black leading-none tracking-tight text-slate-950" :class="animatingSlots?.length ? 'animate-stamp-count' : undefined">
          {{ stampCount }}<span class="text-2xl text-slate-400">/{{ maxStamps }}</span>
        </p>
        <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">stamps</p>
      </div>

      <div class="grid min-w-0 flex-1 grid-cols-5 gap-2">
        <component
          :is="editable && slot.isReward && slot.milestone ? 'button' : 'div'"
          v-for="slot in slots"
          :key="slot.position"
          :type="editable && slot.isReward && slot.milestone ? 'button' : undefined"
          :title="slot.milestone ? `${slot.milestone.required_stamps} stamps → ${slot.milestone.title}` : undefined"
          :class="[
            'grid aspect-square place-items-center rounded-xl text-sm font-bold transition',
            slot.filled
              ? 'bg-amber-400 text-white shadow-sm shadow-amber-200'
              : slot.isReward
                ? 'bg-rose-50 text-rose-500 ring-1 ring-rose-100'
                : 'bg-slate-100 text-slate-300',
            animatingSlots?.includes(slot.position) && 'animate-stamp-pop',
            celebratingReward && slot.isReward && slot.filled && 'animate-reward-glow',
            slotRingClass(slot),
            editable && slot.isReward && slot.milestone && 'cursor-pointer',
          ]"
          @click="onRewardSlotClick(slot.position)"
        >
          <span v-if="slot.filled" aria-hidden="true">★</span>
          <svg
            v-else-if="slot.isReward"
            viewBox="0 0 24 24"
            class="size-4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <rect x="3" y="8" width="18" height="13" rx="2" />
            <path d="M12 8v13M3 12h18M8 8c0-2 1.5-4 4-4s4 2 4 4" />
          </svg>
          <span v-else>{{ slot.position }}</span>
        </component>
      </div>
    </div>

    <p v-if="editable" class="mt-4 text-center text-xs text-slate-500">
      Tap a gift slot on the grid to edit that milestone.
    </p>
  </article>
</template>

<style scoped>
@keyframes stamp-pop {
  0% {
    transform: scale(0.55);
    opacity: 0.4;
  }

  55% {
    transform: scale(1.18);
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes stamp-count {
  0%,
  100% {
    transform: scale(1);
  }

  40% {
    transform: scale(1.08);
  }
}

@keyframes reward-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(251 191 36 / 0.45);
  }

  50% {
    box-shadow: 0 0 0 6px rgb(251 191 36 / 0);
  }
}

.animate-stamp-pop {
  animation: stamp-pop 0.65s ease-out;
}

.animate-stamp-count {
  animation: stamp-count 0.65s ease-out;
}

.animate-reward-glow {
  animation: reward-glow 1s ease-in-out 2;
}
</style>
