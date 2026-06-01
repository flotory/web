<script setup lang="ts">
import { Archive, Copy, Gift, Pencil } from '@lucide/vue'
import { computed } from 'vue'

import { rewardThumbUrl } from '@/lib/rewardMedia'
import type { VenueLandingPayload } from '@/lib/onboarding'

export type GridMilestone = VenueLandingPayload['milestones'][number] & {
  active?: boolean
  isDraft?: boolean
}

const props = withDefaults(
  defineProps<{
    milestones: GridMilestone[]
    stamps?: number
    animatingSlots?: number[]
    celebratingReward?: boolean
    editable?: boolean
    selectedMilestoneId?: number | null
    menuSaving?: boolean
    variant?: 'compact' | 'prominent'
  }>(),
  {
    stamps: 0,
    animatingSlots: () => [],
    celebratingReward: false,
    editable: false,
    selectedMilestoneId: null,
    menuSaving: false,
    variant: 'compact',
  },
)

const emit = defineEmits<{
  menuAction: [action: 'edit' | 'duplicate' | 'archive' | 'reactivate' | 'delete', milestoneId: number]
}>()

const isProminent = computed(() => props.variant === 'prominent')

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
  if (isProminent.value) {
    if (maxStamps.value <= 5) {
      return 'grid-cols-5'
    }
    return 'grid-cols-6'
  }

  if (maxStamps.value <= 5) {
    return 'grid-cols-5'
  }

  return 'grid-cols-6'
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
    return 'border-indigo-300 bg-white shadow-lg shadow-indigo-100/60 ring-2 ring-indigo-400/35'
  }

  if (slot.filled) {
    return 'border-amber-200/90 bg-white shadow-md shadow-amber-100/50'
  }

  return isProminent.value
    ? 'border-slate-200 bg-white shadow-md shadow-slate-200/50'
    : 'border-slate-200/90 bg-white shadow-sm shadow-slate-200/40'
}
</script>

<template>
  <article
    class="loyalty-preview-card w-full rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-16px_rgba(15,23,42,0.12)]"
    :class="isProminent ? 'max-w-none p-5 sm:p-6' : 'mx-auto max-w-md p-4 sm:p-5'"
  >
    <div
      class="flex items-center justify-between gap-3"
      :class="isProminent ? 'mb-4' : 'mb-3'"
    >
      <div class="flex items-baseline gap-2">
        <span
          class="font-semibold tabular-nums tracking-tight text-slate-950"
          :class="[
            animatingSlots?.length ? 'animate-stamp-count' : undefined,
            isProminent ? 'text-3xl sm:text-4xl' : 'text-2xl',
          ]"
        >
          {{ stampCount }}
        </span>
        <span
          class="font-medium text-slate-400"
          :class="isProminent ? 'text-base' : 'text-sm'"
        >
          / {{ maxStamps }} stamps
        </span>
      </div>
      <span
        v-if="editable"
        class="rounded-full bg-slate-100 font-semibold uppercase tracking-wide text-slate-500"
        :class="isProminent ? 'px-2.5 py-1 text-[11px]' : 'hidden px-2 py-0.5 text-[10px] sm:inline'"
      >
        Hover to edit rewards
      </span>
    </div>

    <div
      class="grid w-full"
      :class="[
        gridColumnClass,
        isProminent ? 'gap-2 sm:gap-2.5' : 'gap-1.5 sm:gap-2',
      ]"
    >
      <div
        v-for="slot in slots"
        :key="slot.position"
        class="flex min-h-0 items-stretch justify-center"
      >
        <!-- Reward milestone -->
        <div
          v-if="slot.isReward && slot.milestone"
          :title="`${slot.milestone.required_stamps} stamps → ${slot.milestone.title}`"
          :tabindex="canManageMilestone(slot.milestone) ? 0 : undefined"
          class="group relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border transition duration-200"
          :class="[
            isProminent
              ? 'min-h-[5.75rem] sm:min-h-[6.75rem] md:min-h-[7.5rem]'
              : 'h-[4.75rem] sm:h-[5.25rem]',
            rewardCardClass(slot),
            editable && canManageMilestone(slot.milestone) && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg',
            animatingSlots?.includes(slot.position) && 'animate-stamp-pop',
            celebratingReward && slot.filled && 'animate-reward-glow',
          ]"
        >
          <div
            class="relative min-h-0 overflow-hidden bg-slate-100"
            :class="isProminent ? 'flex-[1.35]' : 'flex-[1.15]'"
          >
            <img
              :src="rewardThumbUrl(slot.milestone)"
              :alt="slot.milestone.title"
              class="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
            >
            <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-transparent" />

            <span
              v-if="slot.filled"
              class="absolute left-1.5 top-1.5 grid place-items-center rounded-full bg-amber-400 text-white shadow-sm"
              :class="isProminent ? 'size-5 text-[10px]' : 'size-4 text-[9px]'"
              aria-hidden="true"
            >
              ★
            </span>

            <span
              v-if="!isProminent"
              class="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-md bg-white/90 px-1 py-0.5 text-[9px] font-medium text-rose-500 shadow-sm backdrop-blur-sm"
              aria-hidden="true"
            >
              <Gift class="size-2.5" :stroke-width="2.2" />
            </span>

            <span
              class="absolute right-1.5 top-1.5 rounded-full bg-white font-bold tabular-nums text-slate-800 shadow-sm ring-1 ring-slate-200/90"
              :class="isProminent ? 'px-2 py-0.5 text-[11px] sm:text-xs' : 'px-1.5 py-0.5 text-[9px]'"
            >
              {{ slot.milestone.required_stamps }} {{ slot.milestone.required_stamps === 1 ? 'stamp' : 'stamps' }}
            </span>

            <div
              v-if="canManageMilestone(slot.milestone)"
              class="absolute inset-0 z-10 flex items-end justify-center gap-1.5 bg-slate-950/50 p-2 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg bg-white font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                :class="isProminent ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[10px]'"
                :disabled="menuSaving"
                @click.stop="onAction('edit', slot.milestone.id)"
              >
                <Pencil class="size-3.5" :stroke-width="2.2" />
                Edit
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg bg-white font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
                :class="isProminent ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[10px]'"
                :disabled="menuSaving"
                @click.stop="onAction('duplicate', slot.milestone.id)"
              >
                <Copy class="size-3.5" :stroke-width="2.2" />
                Duplicate
              </button>
              <button
                v-if="slot.milestone.active !== false"
                type="button"
                class="inline-flex items-center gap-1 rounded-lg bg-white font-semibold text-amber-900 shadow-sm hover:bg-amber-50"
                :class="isProminent ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[10px]'"
                :disabled="menuSaving"
                @click.stop="onAction('archive', slot.milestone.id)"
              >
                <Archive class="size-3.5" :stroke-width="2.2" />
                Archive
              </button>
              <button
                v-else
                type="button"
                class="rounded-lg bg-white font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
                :class="isProminent ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[10px]'"
                :disabled="menuSaving"
                @click.stop="onAction('reactivate', slot.milestone.id)"
              >
                Restore
              </button>
            </div>
          </div>

          <div
            class="flex shrink-0 items-center border-t border-slate-100/90 bg-white"
            :class="isProminent ? 'px-2.5 py-2' : 'px-1.5 py-1'"
          >
            <p
              class="min-w-0 flex-1 font-semibold leading-snug text-slate-900"
              :class="[
                isProminent ? 'line-clamp-2 text-xs sm:text-sm' : 'line-clamp-1 text-[10px] sm:text-[11px]',
              ]"
            >
              {{ slot.milestone.title }}
            </p>
          </div>
        </div>

        <!-- Empty / progress stamp placeholder -->
        <div
          v-else
          class="flex shrink-0 items-center justify-center self-center rounded-lg border transition"
          :class="[
            isProminent ? 'size-8 sm:size-9' : 'size-8 sm:size-9',
            slot.filled
              ? 'border-amber-200/80 bg-amber-100 text-amber-600 shadow-sm'
              : 'border-dashed border-slate-200/80 bg-slate-50/50 text-slate-300',
            animatingSlots?.includes(slot.position) && 'animate-stamp-pop',
          ]"
          :aria-label="`Stamp ${slot.position}`"
        >
          <span v-if="slot.filled" class="font-bold" :class="isProminent ? 'text-xs' : 'text-[11px]'" aria-hidden="true">★</span>
          <span v-else class="font-medium tabular-nums" :class="isProminent ? 'text-[11px]' : 'text-[10px]'">{{ slot.position }}</span>
        </div>
      </div>
    </div>

    <p
      v-if="editable"
      class="text-center text-slate-400"
      :class="isProminent ? 'mt-4 text-xs' : 'mt-3 text-[11px]'"
    >
      Each numbered slot is a stamp · reward cards show what guests unlock
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
