<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { rewardImageUrl } from '@/lib/rewardMedia'
import type { VenueLandingPayload } from '@/lib/onboarding'

const props = defineProps<{
  milestones: VenueLandingPayload['milestones']
  stamps?: number
}>()

const scrollEl = ref<HTMLElement | null>(null)
const canScrollDown = ref(false)
const isAtBottom = ref(false)

const stampCount = computed(() => props.stamps ?? 0)

const sortedMilestones = computed(() =>
  [...props.milestones].sort((a, b) => a.required_stamps - b.required_stamps),
)

const primaryMilestone = computed(() => sortedMilestones.value[0] ?? null)
const upcomingMilestones = computed(() => sortedMilestones.value.slice(1))

const maxStamps = computed(() => {
  const last = sortedMilestones.value.at(-1)?.required_stamps
  return last && last > 0 ? last : 10
})

const milestonePositions = computed(() => new Set(sortedMilestones.value.map((m) => m.required_stamps)))

const slots = computed(() =>
  Array.from({ length: maxStamps.value }, (_, index) => {
    const position = index + 1
    return {
      position,
      filled: position <= stampCount.value,
      isReward: milestonePositions.value.has(position),
    }
  }),
)

const stampsToPrimary = computed(() => {
  if (!primaryMilestone.value) return maxStamps.value
  return Math.max(primaryMilestone.value.required_stamps - stampCount.value, 0)
})

const showScrollHint = computed(() => canScrollDown.value && !isAtBottom.value)

function updateScrollState() {
  const element = scrollEl.value
  if (!element) {
    canScrollDown.value = false
    isAtBottom.value = false
    return
  }

  canScrollDown.value = element.scrollHeight - element.clientHeight > 8
  isAtBottom.value = element.scrollTop + element.clientHeight >= element.scrollHeight - 8
}

function bindScrollListeners() {
  scrollEl.value?.addEventListener('scroll', updateScrollState, { passive: true })
}

function unbindScrollListeners() {
  scrollEl.value?.removeEventListener('scroll', updateScrollState)
}

onMounted(() => {
  window.addEventListener('resize', updateScrollState)
})

onUnmounted(() => {
  unbindScrollListeners()
  window.removeEventListener('resize', updateScrollState)
})

watch(upcomingMilestones, async () => {
  unbindScrollListeners()
  await nextTick()
  bindScrollListeners()
  updateScrollState()
}, { deep: true, immediate: true })
</script>

<template>
  <div class="space-y-4">
    <article class="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.18)]">
      <div class="flex items-start gap-4">
        <div class="shrink-0">
          <p class="text-4xl font-black leading-none tracking-tight text-slate-950">
            {{ stampCount }}<span class="text-2xl text-slate-400">/{{ maxStamps }}</span>
          </p>
          <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">stamps</p>
        </div>

        <div class="grid min-w-0 flex-1 grid-cols-5 gap-2">
          <div
            v-for="slot in slots"
            :key="slot.position"
            :class="[
              'grid aspect-square place-items-center rounded-xl text-sm font-bold transition',
              slot.filled
                ? 'bg-amber-400 text-white shadow-sm shadow-amber-200'
                : slot.isReward
                  ? 'bg-rose-50 text-rose-500 ring-1 ring-rose-100'
                  : 'bg-slate-100 text-slate-300',
            ]"
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
          </div>
        </div>
      </div>

      <div v-if="primaryMilestone" class="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
        <img
          :src="rewardImageUrl(primaryMilestone)"
          :alt="primaryMilestone.title"
          class="size-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-200/80"
        >
        <div class="min-w-0">
          <p class="text-sm text-slate-500">
            <span v-if="stampsToPrimary === 0">Ready to claim:</span>
            <span v-else>{{ stampsToPrimary }} more {{ stampsToPrimary === 1 ? 'stamp' : 'stamps' }} to:</span>
          </p>
          <p class="truncate text-base font-black text-slate-950">{{ primaryMilestone.title }}</p>
        </div>
      </div>
    </article>

    <div v-if="upcomingMilestones.length" class="relative">
      <div
        ref="scrollEl"
        class="max-h-[14.5rem] space-y-3 overflow-y-auto scroll-smooth snap-y snap-mandatory pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <article
          v-for="milestone in upcomingMilestones"
          :key="milestone.id"
          class="snap-start rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.2)]"
        >
          <div class="flex items-center gap-3">
            <img
              :src="rewardImageUrl(milestone)"
              :alt="milestone.title"
              class="size-16 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200/80"
            >
            <div class="min-w-0 flex-1">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Next reward</p>
              <p class="truncate text-lg font-black text-slate-950">{{ milestone.title }}</p>
              <p class="mt-1 text-sm font-semibold text-slate-500">
                Collect {{ milestone.required_stamps }} stamps to unlock
              </p>
            </div>
          </div>
        </article>
      </div>

      <div
        v-if="showScrollHint"
        class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center justify-end rounded-b-[1.5rem] bg-gradient-to-t from-[#f7f8fb] via-[#f7f8fb]/95 to-transparent pb-2 pt-10"
        aria-hidden="true"
      >
        <p class="text-xs font-semibold text-slate-500">Scroll for more rewards</p>
        <svg viewBox="0 0 24 24" class="mt-1 size-4 animate-bounce text-slate-400" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    </div>
  </div>
</template>
