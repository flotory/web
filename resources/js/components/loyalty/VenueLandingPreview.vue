<script setup lang="ts">
import { Archive, Copy, Gift, Pencil } from '@lucide/vue'
import { computed } from 'vue'

import { rewardThumbUrl } from '@/lib/rewardMedia'
import type { VenueLandingPayload } from '@/lib/onboarding'

export type GridMilestone = VenueLandingPayload['milestones'][number] & {
  active?: boolean
  isDraft?: boolean
}

const props = defineProps<{
  milestones: GridMilestone[]
  stamps?: number
  animatingSlots?: number[]
  celebratingReward?: boolean
  editable?: boolean
  selectedMilestoneId?: number | null
  menuSaving?: boolean
}>()

const emit = defineEmits<{
  menuAction: [action: 'edit' | 'duplicate' | 'archive' | 'reactivate' | 'delete', milestoneId: number]
}>()

const stampCount = computed(() => props.stamps ?? 0)

const sortedMilestones = computed(() =>
  [...props.milestones].sort((a, b) => a.required_stamps - b.required_stamps),
)

const milestoneByPosition = computed(() => {
  const map = new Map<number, GridMilestone>()
  for (const milestone of sortedMilestones.value) {
    map.set(milestone.required_stamps, milestone)
  }
  return map
})

const maxStamps = computed(() => {
  const last = sortedMilestones.value.at(-1)?.required_stamps
  return last && last > 0 ? last : 10
})

const gridColumnClass = computed(() => {
  if (maxStamps.value <= 5) {
    return 'grid-cols-5'
  }
  if (maxStamps.value <= 6) {
    return 'grid-cols-6'
  }
  return 'grid-cols-6 sm:grid-cols-6'
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

function canManageMilestone(milestone: GridMilestone): boolean {
  return props.editable && milestone.id > 0 && !milestone.isDraft
}

function onAction(action: 'edit' | 'duplicate' | 'archive' | 'reactivate' | 'delete', milestoneId: number) {
  emit('menuAction', action, milestoneId)
}

function rewardCardClass(slot: { filled: boolean; milestone: GridMilestone | null }): string {
  const selected = props.selectedMilestoneId === slot.milestone?.id
  const draft = slot.milestone?.isDraft

  if (draft) {
    return 'border-dashed border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-200/60'
  }

  if (selected) {
    return 'border-indigo-300 bg-white shadow-md shadow-indigo-100/50 ring-2 ring-indigo-400/30'
  }

  if (slot.filled) {
    return 'border-amber-200/80 bg-white shadow-sm shadow-amber-100/40'
  }

  return 'border-slate-200/90 bg-white shadow-sm shadow-slate-200/40'
}
</script>

<template>
  <article class="loyalty-preview-card mx-auto w-full max-w-xl rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] sm:p-5">
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="flex items-baseline gap-1.5">
        <span
          class="text-2xl font-semibold tabular-nums tracking-tight text-slate-950"
          :class="animatingSlots?.length ? 'animate-stamp-count' : undefined"
        >
          {{ stampCount }}
        </span>
        <span class="text-sm font-medium text-slate-400">/ {{ maxStamps }} stamps</span>
      </div>
      <span
        v-if="editable"
        class="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:inline"
      >
        Hover to edit
      </span>
    </div>

    <div class="grid gap-1.5 sm:gap-2" :class="gridColumnClass">
      <div
        v-for="slot in slots"
        :key="slot.position"
        class="flex min-h-0 items-center justify-center"
        :class="slot.isReward ? 'row-span-1' : ''"
      >
        <!-- Reward milestone -->
        <div
          v-if="slot.isReward && slot.milestone"
          :title="`${slot.milestone.required_stamps} stamps → ${slot.milestone.title}`"
          :tabindex="canManageMilestone(slot.milestone) ? 0 : undefined"
          class="group relative flex h-[4.75rem] w-full min-w-0 flex-col overflow-hidden rounded-xl border transition duration-200 sm:h-[5.25rem]"
          :class="[
            rewardCardClass(slot),
            editable && canManageMilestone(slot.milestone) && 'cursor-pointer hover:-translate-y-px hover:shadow-md',
            animatingSlots?.includes(slot.position) && 'animate-stamp-pop',
            celebratingReward && slot.filled && 'animate-reward-glow',
          ]"
        >
          <div class="relative min-h-0 flex-[1.15] overflow-hidden bg-slate-100">
            <img
              :src="rewardThumbUrl(slot.milestone)"
              :alt="slot.milestone.title"
              class="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            >
            <div
              class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent"
            />

            <span
              v-if="slot.filled"
              class="absolute left-1 top-1 grid size-4 place-items-center rounded-full bg-amber-400 text-[9px] text-white shadow-sm"
              aria-hidden="true"
            >
              ★
            </span>

            <span
              class="absolute left-1 bottom-1 inline-flex items-center gap-0.5 rounded-md bg-white/90 px-1 py-0.5 text-[9px] font-medium text-rose-500 shadow-sm backdrop-blur-sm"
              aria-hidden="true"
            >
              <Gift class="size-2.5" :stroke-width="2.2" />
            </span>

            <span
              class="absolute right-1 top-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-slate-700 shadow-sm ring-1 ring-slate-200/80"
            >
              {{ slot.milestone.required_stamps }}
            </span>

            <!-- Owner hover actions -->
            <div
              v-if="canManageMilestone(slot.milestone)"
              class="absolute inset-0 z-10 flex items-end justify-center gap-1 bg-slate-950/45 p-1.5 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                :disabled="menuSaving"
                @click.stop="onAction('edit', slot.milestone.id)"
              >
                <Pencil class="size-3" :stroke-width="2.2" />
                Edit
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                :disabled="menuSaving"
                @click.stop="onAction('duplicate', slot.milestone.id)"
              >
                <Copy class="size-3" :stroke-width="2.2" />
              </button>
              <button
                v-if="slot.milestone.active !== false"
                type="button"
                class="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-amber-800 shadow-sm hover:bg-amber-50"
                :disabled="menuSaving"
                @click.stop="onAction('archive', slot.milestone.id)"
              >
                <Archive class="size-3" :stroke-width="2.2" />
              </button>
              <button
                v-else
                type="button"
                class="rounded-lg bg-white px-2 py-1 text-[10px] font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
                :disabled="menuSaving"
                @click.stop="onAction('reactivate', slot.milestone.id)"
              >
                Restore
              </button>
            </div>
          </div>

          <div class="flex shrink-0 items-center border-t border-slate-100/90 bg-white px-1.5 py-1">
            <p class="line-clamp-1 min-w-0 flex-1 text-[10px] font-semibold leading-tight text-slate-900 sm:text-[11px]">
              {{ slot.milestone.title }}
            </p>
          </div>
        </div>

        <!-- Empty / progress stamp placeholder -->
        <div
          v-else
          class="flex size-8 items-center justify-center rounded-lg border transition sm:size-9"
          :class="[
            slot.filled
              ? 'border-amber-200/80 bg-amber-100 text-amber-600 shadow-sm'
              : 'border-dashed border-slate-200/90 bg-slate-50/60 text-slate-300',
            animatingSlots?.includes(slot.position) && 'animate-stamp-pop',
          ]"
          :aria-label="`Stamp ${slot.position}`"
        >
          <span v-if="slot.filled" class="text-[11px] font-bold" aria-hidden="true">★</span>
          <span v-else class="text-[10px] font-medium tabular-nums">{{ slot.position }}</span>
        </div>
      </div>
    </div>

    <p v-if="editable" class="mt-3 text-center text-[11px] text-slate-400">
      Reward cards match guest Wallet · hover a reward to manage
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
    transform: scale(1.12);
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
    transform: scale(1.06);
  }
}

@keyframes reward-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(251 191 36 / 0.35);
  }

  50% {
    box-shadow: 0 0 0 5px rgb(251 191 36 / 0);
  }
}

.animate-stamp-pop {
  animation: stamp-pop 0.55s ease-out;
}

.animate-stamp-count {
  animation: stamp-count 0.55s ease-out;
}

.animate-reward-glow {
  animation: reward-glow 1s ease-in-out 2;
}
</style>
