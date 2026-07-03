<script setup lang="ts">
import { Archive, Gift, Pencil } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

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
  menuAction: [action: 'edit' | 'archive' | 'reactivate' | 'delete', milestoneId: number]
}>()

const clickedMilestoneId = ref<number | null>(null)

const isProminent = computed(() => props.variant === 'prominent')

const activeManageMilestone = computed(() => {
  if (!props.editable) {
    return null
  }

  const id = clickedMilestoneId.value ?? props.selectedMilestoneId
  if (id == null) {
    return null
  }

  const milestone = sortedMilestones.value.find((m) => m.id === id)
  if (!milestone || milestone.id <= 0 || milestone.isDraft) {
    return null
  }

  return milestone
})

function selectMilestone(milestoneId: number) {
  clickedMilestoneId.value = clickedMilestoneId.value === milestoneId ? null : milestoneId
}

function isMilestoneHighlighted(milestoneId: number): boolean {
  return activeManageMilestone.value?.id === milestoneId
}

const stampCount = computed(() => props.stamps ?? 0)

const sortedMilestones = computed(() =>
  [...props.milestones].sort((a, b) => a.required_stamps - b.required_stamps),
)

watch(sortedMilestones, (milestones) => {
  if (clickedMilestoneId.value == null) {
    return
  }

  if (!milestones.some((milestone) => milestone.id === clickedMilestoneId.value)) {
    clickedMilestoneId.value = null
  }
})

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

const gridColumnClass = computed(() => 'grid-cols-5')

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

function onAction(action: 'edit' | 'archive' | 'reactivate' | 'delete', milestoneId: number) {
  emit('menuAction', action, milestoneId)
}

function rewardCardClass(slot: { filled: boolean; milestone: GridMilestone | null }): string {
  const selected = isMilestoneHighlighted(slot.milestone?.id ?? -1)
  const draft = slot.milestone?.isDraft

  if (draft) {
    return 'border-dashed border-accent-border bg-accent-soft/40 border border-accent-border/60'
  }

  if (selected) {
    return 'border-accent bg-surface shadow-lg shadow-accent-soft/60 border-2 border-accent/50'
  }

  if (slot.filled) {
    return 'border-accent-border/90 bg-surface shadow-md shadow-accent-soft/50'
  }

  return isProminent.value
    ? 'border-border bg-surface shadow-md shadow-border/50'
    : 'border-border/90 bg-surface shadow-sm shadow-border/40'
}
</script>

<template>
  <article
    class="loyalty-preview-card w-full rounded-2xl border border-border/80 bg-gradient-to-b from-surface to-surface-muted/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-16px_rgba(15,23,42,0.12)]"
    :class="isProminent ? 'max-w-none p-5 sm:p-6' : 'mx-auto max-w-md p-4 sm:p-5'"
  >
    <div
      class="flex items-center justify-between gap-3"
      :class="isProminent ? 'mb-4' : 'mb-3'"
    >
      <div class="flex items-baseline gap-2">
        <span
          class="font-semibold tabular-nums tracking-tight text-ink"
          :class="[
            animatingSlots?.length ? 'animate-stamp-count' : undefined,
            isProminent ? 'text-3xl sm:text-4xl' : 'text-2xl',
          ]"
        >
          {{ stampCount }}
        </span>
        <span
          class="font-medium text-ink-soft"
          :class="isProminent ? 'text-base' : 'text-sm'"
        >
          / {{ maxStamps }} stamps
        </span>
      </div>
      <span
        v-if="editable"
        class="rounded-full bg-surface-muted font-semibold uppercase tracking-wide text-ink-muted"
        :class="isProminent ? 'px-2.5 py-1 text-[11px]' : 'hidden px-2 py-0.5 text-[10px] sm:inline'"
      >
        Click a reward to manage
      </span>
    </div>

    <div class="w-full">
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
            rewardCardClass(slot),
            editable && canManageMilestone(slot.milestone) && 'cursor-pointer',
            animatingSlots?.includes(slot.position) && 'animate-stamp-pop',
            celebratingReward && slot.filled && 'animate-reward-glow',
          ]"
          @click="canManageMilestone(slot.milestone) && selectMilestone(slot.milestone.id)"
          @keydown.enter.prevent="canManageMilestone(slot.milestone) && selectMilestone(slot.milestone.id)"
          @keydown.space.prevent="canManageMilestone(slot.milestone) && selectMilestone(slot.milestone.id)"
        >
          <div class="relative aspect-square w-full overflow-hidden bg-surface-muted">
            <img
              :src="rewardThumbUrl(slot.milestone)"
              :alt="slot.milestone.title"
              class="size-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
            >
            <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />

            <span
              v-if="slot.filled"
              class="absolute left-1.5 top-1.5 grid place-items-center rounded-full bg-accent text-white shadow-sm"
              :class="isProminent ? 'size-5 text-[10px]' : 'size-4 text-[9px]'"
              aria-hidden="true"
            >
              ★
            </span>

            <span
              v-if="!isProminent"
              class="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-md bg-surface/90 px-1 py-0.5 text-[9px] font-medium text-rose-500 shadow-sm backdrop-blur-sm"
              aria-hidden="true"
            >
              <Gift class="size-2.5" :stroke-width="2.2" />
            </span>

            <span
              class="absolute right-1.5 top-1.5 rounded-full bg-surface font-bold tabular-nums text-ink shadow-sm border border-border/90"
              :class="isProminent ? 'px-2 py-0.5 text-[11px] sm:text-xs' : 'px-1.5 py-0.5 text-[9px]'"
            >
              {{ slot.milestone.required_stamps }} {{ slot.milestone.required_stamps === 1 ? 'stamp' : 'stamps' }}
            </span>
          </div>

          <div
            class="flex shrink-0 items-center border-t border-border/90 bg-surface"
            :class="isProminent ? 'px-2.5 py-2' : 'px-1.5 py-1'"
          >
            <p
              class="min-w-0 flex-1 font-semibold leading-snug text-ink"
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
            isProminent ? 'size-10 sm:size-11' : 'size-9 sm:size-10',
            slot.filled
              ? 'border-accent-border bg-accent-soft text-accent-active shadow-sm border border-accent-border/60'
              : 'border-dashed border-border bg-surface-muted/90 text-ink-muted border border-border/50',
            animatingSlots?.includes(slot.position) && 'animate-stamp-pop',
          ]"
          :aria-label="`Stamp ${slot.position}`"
        >
          <span v-if="slot.filled" class="font-bold" :class="isProminent ? 'text-sm' : 'text-xs'" aria-hidden="true">★</span>
          <span v-else class="font-semibold tabular-nums" :class="isProminent ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs'">{{ slot.position }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="editable"
      class="mt-3 flex h-[6.75rem] flex-col justify-center gap-2 overflow-hidden rounded-xl border px-3 py-2 shadow-sm sm:h-[4.25rem] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-0"
      :class="activeManageMilestone
        ? 'border-accent-border/80 bg-accent-soft/90'
        : 'border-border/80 bg-surface-muted/60'"
    >
      <div v-if="activeManageMilestone" class="min-h-0 min-w-0 flex-1">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-primary">
          {{ activeManageMilestone.required_stamps }} {{ activeManageMilestone.required_stamps === 1 ? 'stamp' : 'stamps' }}
        </p>
        <p class="truncate text-sm font-semibold text-ink sm:text-base">
          {{ activeManageMilestone.title }}
        </p>
      </div>
      <p
        v-else
        class="min-w-0 flex-1 text-center text-sm text-ink-soft sm:text-left"
      >
        Click a reward card to edit or archive
      </p>

      <div
        class="flex shrink-0 flex-wrap justify-center gap-2 sm:justify-end"
        :class="!activeManageMilestone && 'invisible'"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-border hover:bg-surface-muted disabled:opacity-50"
          :disabled="menuSaving || !activeManageMilestone"
          tabindex="-1"
          @click.stop="activeManageMilestone && onAction('edit', activeManageMilestone.id)"
        >
          <Pencil class="size-4" :stroke-width="2.2" />
          Edit
        </button>
        <button
          v-if="!activeManageMilestone || activeManageMilestone.active !== false"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-accent-border bg-surface px-3 py-2 text-sm font-semibold text-accent-active shadow-sm transition hover:border-accent-border hover:bg-accent-soft disabled:opacity-50"
          :disabled="menuSaving || !activeManageMilestone"
          tabindex="-1"
          @click.stop="activeManageMilestone && onAction('archive', activeManageMilestone.id)"
        >
          <Archive class="size-4" :stroke-width="2.2" />
          Archive
        </button>
        <button
          v-else
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-success-border bg-surface px-3 py-2 text-sm font-semibold text-success-text shadow-sm transition hover:border-success-border hover:bg-success-bg disabled:opacity-50"
          :disabled="menuSaving"
          @click.stop="onAction('reactivate', activeManageMilestone.id)"
        >
          Restore
        </button>
      </div>
    </div>
    </div>
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
