<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import DashboardActiveCampaignCard from '@/components/campaigns/DashboardActiveCampaignCard.vue'
import type { Campaign } from '@/lib/campaignTemplates'

const props = defineProps<{
  campaigns: Campaign[]
}>()

const emit = defineEmits<{
  pause: [campaign: Campaign]
  edit: [campaign: Campaign]
  end: [campaign: Campaign]
}>()

const trackRef = ref<HTMLElement | null>(null)
const canScrollPrev = ref(false)
const canScrollNext = ref(false)

const countLabel = computed(() => `${props.campaigns.length}`)

function updateScrollState() {
  const track = trackRef.value
  if (!track) {
    canScrollPrev.value = false
    canScrollNext.value = false
    return
  }

  canScrollPrev.value = track.scrollLeft > 8
  canScrollNext.value = track.scrollLeft + track.clientWidth < track.scrollWidth - 8
}

function scrollByPage(direction: -1 | 1) {
  const track = trackRef.value
  if (!track) {
    return
  }

  track.scrollBy({
    left: direction * track.clientWidth * 0.85,
    behavior: 'smooth',
  })
}

onMounted(() => {
  updateScrollState()
  trackRef.value?.addEventListener('scroll', updateScrollState, { passive: true })
  window.addEventListener('resize', updateScrollState)
})

watch(
  () => props.campaigns.length,
  () => {
    void nextTick(updateScrollState)
  },
)

onUnmounted(() => {
  trackRef.value?.removeEventListener('scroll', updateScrollState)
  window.removeEventListener('resize', updateScrollState)
})
</script>

<template>
  <section class="mt-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-xl font-black text-slate-950">Active campaigns</h2>
          <span
            v-if="campaigns.length"
            class="inline-flex size-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
          >
            {{ countLabel }}
          </span>
        </div>
        <p class="mt-1 max-w-2xl text-sm text-slate-500">
          Customers receive the highest eligible multiplier. Campaigns never stack.
        </p>
      </div>
      <RouterLink
        to="/campaigns"
        class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-slate-700"
      >
        Manage all campaigns
        <ChevronRight class="size-3.5" aria-hidden="true" />
      </RouterLink>
    </div>

    <div v-if="campaigns.length" class="relative mt-5">
      <button
        v-if="canScrollPrev"
        type="button"
        class="absolute left-0 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        aria-label="Previous campaigns"
        @click="scrollByPage(-1)"
      >
        <ChevronLeft class="size-4" />
      </button>

      <div
        ref="trackRef"
        class="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        :class="canScrollPrev || canScrollNext ? 'sm:px-10' : ''"
      >
        <DashboardActiveCampaignCard
          v-for="campaign in campaigns"
          :key="campaign.id"
          class="w-[min(100%,22rem)] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] lg:w-[calc(50%-0.5rem)]"
          :campaign="campaign"
          @pause="emit('pause', campaign)"
          @edit="emit('edit', campaign)"
          @end="emit('end', campaign)"
        />
      </div>

      <button
        v-if="canScrollNext"
        type="button"
        class="absolute right-0 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
        aria-label="Next campaigns"
        @click="scrollByPage(1)"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>

    <div
      v-else
      class="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center"
    >
      <p class="text-sm font-semibold text-slate-600">No active campaigns right now.</p>
      <RouterLink
        to="/campaigns"
        class="mt-2 inline-block text-sm font-bold text-slate-950 underline-offset-2 hover:underline"
      >
        Create a campaign
      </RouterLink>
    </div>
  </section>
</template>
