<script setup lang="ts">
import { MoreVertical } from '@lucide/vue'
import { computed, ref, watch } from 'vue'

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
  menuOpenMilestoneId?: number | null
  menuSaving?: boolean
}>()

const emit = defineEmits<{
  toggleMenu: [milestoneId: number]
  menuAction: [action: 'edit' | 'duplicate' | 'archive' | 'reactivate' | 'delete', milestoneId: number]
}>()

const menuPosition = ref<{ top: number; left: number } | null>(null)

const stampCount = computed(() => props.stamps ?? 0)

const openMenuMilestone = computed(() => {
  if (props.menuOpenMilestoneId === null) {
    return null
  }
  return sortedMilestones.value.find((milestone) => milestone.id === props.menuOpenMilestoneId) ?? null
})

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

watch(
  () => props.menuOpenMilestoneId,
  (id) => {
    if (id === null) {
      menuPosition.value = null
    }
  },
)

function slotRingClass(slot: { isReward: boolean; milestone: GridMilestone | null }): string {
  if (!props.editable || !slot.isReward || !slot.milestone) {
    return ''
  }

  if (props.selectedMilestoneId === slot.milestone.id || props.menuOpenMilestoneId === slot.milestone.id) {
    return 'ring-2 ring-indigo-500 ring-offset-2'
  }

  return 'ring-1 ring-rose-200'
}

function slotBaseClass(slot: { filled: boolean; isReward: boolean }): string[] {
  if (slot.isReward) {
    return ['relative overflow-visible p-0 ring-1 ring-rose-100']
  }

  if (slot.filled) {
    return ['bg-amber-400 text-white shadow-sm shadow-amber-200']
  }

  return ['bg-slate-100 text-slate-300']
}

function canManageMilestone(milestone: GridMilestone): boolean {
  return props.editable && milestone.id > 0 && !milestone.isDraft
}

function onMenuToggle(event: MouseEvent, milestone: GridMilestone) {
  event.stopPropagation()
  event.preventDefault()

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()

  if (props.menuOpenMilestoneId === milestone.id) {
    menuPosition.value = null
  } else {
    menuPosition.value = {
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 144),
    }
  }

  emit('toggleMenu', milestone.id)
}

function onMenuAction(action: 'edit' | 'duplicate' | 'archive' | 'reactivate' | 'delete', milestoneId: number) {
  menuPosition.value = null
  emit('menuAction', action, milestoneId)
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

      <div class="grid min-w-0 flex-1 grid-cols-5 gap-1.5 overflow-visible sm:gap-2">
        <div
          v-for="slot in slots"
          :key="slot.position"
          :title="slot.milestone ? `${slot.milestone.required_stamps} stamps → ${slot.milestone.title}` : undefined"
          :class="[
            'min-h-0 rounded-xl text-sm font-bold transition',
            slot.isReward ? 'flex aspect-square' : 'grid aspect-square place-items-center',
            ...slotBaseClass(slot),
            animatingSlots?.includes(slot.position) && 'animate-stamp-pop',
            celebratingReward && slot.isReward && slot.filled && 'animate-reward-glow',
            slotRingClass(slot),
          ]"
        >
          <!-- Milestone: gift icon on top, photo + info stacked below -->
          <div
            v-if="slot.isReward && slot.milestone"
            class="flex h-full w-full min-w-0 flex-col"
          >
            <div
              class="flex h-[22%] min-h-[18px] shrink-0 items-center justify-center border-b border-rose-100/80"
              :class="slot.filled ? 'bg-amber-400 text-white border-amber-300/50' : 'bg-rose-50 text-rose-500'"
            >
              <svg
                viewBox="0 0 24 24"
                class="size-3.5 shrink-0 sm:size-4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <rect x="3" y="8" width="18" height="13" rx="2" />
                <path d="M12 8v13M3 12h18M8 8c0-2 1.5-4 4-4s4 2 4 4" />
              </svg>
            </div>

            <div
              class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
              :class="slot.filled ? 'bg-amber-50/90' : ''"
            >
              <div class="relative h-[58%] min-h-[1.5rem] w-full shrink-0 bg-slate-100">
                <img
                  :src="rewardThumbUrl(slot.milestone)"
                  :alt="slot.milestone.title"
                  class="size-full object-cover"
                >
                <span
                  v-if="slot.filled"
                  class="absolute left-0.5 top-0.5 grid size-3.5 place-items-center rounded-full bg-amber-400 text-[8px] text-white shadow-sm sm:size-4 sm:text-[9px]"
                  aria-hidden="true"
                >
                  ★
                </span>

                <button
                  v-if="canManageMilestone(slot.milestone)"
                  type="button"
                  class="absolute right-0.5 top-0.5 z-10 grid size-5 place-items-center rounded-md bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200/80 hover:bg-white hover:text-slate-900"
                  :aria-label="`Manage ${slot.milestone.title}`"
                  :aria-expanded="menuOpenMilestoneId === slot.milestone.id"
                  @click="onMenuToggle($event, slot.milestone)"
                >
                  <MoreVertical class="size-3" :stroke-width="2.5" />
                </button>
              </div>

              <div class="flex min-h-0 flex-1 flex-col justify-center gap-0.5 px-1.5 py-1">
                <p class="line-clamp-2 text-[7px] font-black leading-tight text-slate-900 sm:text-[8px]">
                  {{ slot.milestone.title }}
                </p>
                <p class="truncate text-[6px] font-semibold text-slate-500 sm:text-[7px]">
                  {{ slot.milestone.required_stamps }} {{ slot.milestone.required_stamps === 1 ? 'stamp' : 'stamps' }}
                </p>
              </div>
            </div>
          </div>

          <span v-else-if="slot.filled" aria-hidden="true">★</span>
          <span v-else>{{ slot.position }}</span>
        </div>
      </div>
    </div>

    <p v-if="editable" class="mt-4 text-center text-xs text-slate-500">
      Use ⋯ on a reward to edit, duplicate, or archive.
    </p>

    <Teleport to="body">
      <button
        v-if="menuOpenMilestoneId !== null && openMenuMilestone"
        type="button"
        class="fixed inset-0 z-[80] cursor-default bg-transparent"
        aria-label="Close milestone menu"
        @click="emit('toggleMenu', openMenuMilestone.id)"
      />

      <div
        v-if="menuOpenMilestoneId !== null && openMenuMilestone && menuPosition"
        class="fixed z-[90] w-36 rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200"
        :style="{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }"
        @click.stop
      >
        <button
          type="button"
          class="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
          :disabled="menuSaving"
          @click="onMenuAction('edit', openMenuMilestone.id)"
        >
          Edit
        </button>
        <button
          type="button"
          class="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
          :disabled="menuSaving"
          @click="onMenuAction('duplicate', openMenuMilestone.id)"
        >
          Duplicate
        </button>
        <button
          v-if="openMenuMilestone.active !== false"
          type="button"
          class="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50"
          :disabled="menuSaving"
          @click="onMenuAction('archive', openMenuMilestone.id)"
        >
          Archive
        </button>
        <button
          v-else
          type="button"
          class="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          :disabled="menuSaving"
          @click="onMenuAction('reactivate', openMenuMilestone.id)"
        >
          Reactivate
        </button>
        <button
          type="button"
          class="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
          :disabled="menuSaving"
          @click="onMenuAction('delete', openMenuMilestone.id)"
        >
          Delete
        </button>
      </div>
    </Teleport>
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
