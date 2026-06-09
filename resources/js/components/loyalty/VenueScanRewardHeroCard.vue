<script setup lang="ts">
import { Coffee, Croissant, Gift, UtensilsCrossed, Wine } from '@lucide/vue'
import { computed, type Component } from 'vue'

import {
  exampleFilledStamps,
  formatHeroRewardLine,
  formatHeroSubtitle,
} from '@/lib/venueScanLanding'
import type { VenueLandingPayload } from '@/lib/onboarding'
import { rewardThumbUrl } from '@/lib/rewardMedia'

const props = defineProps<{
  venueName: string
  category?: string | null
  hero: VenueLandingPayload['hero_reward']
}>()

const rewardLine = computed(() => formatHeroRewardLine(props.hero, props.venueName))
const subtitle = computed(() => formatHeroSubtitle(props.venueName))
const filledStamps = computed(() =>
  props.hero ? exampleFilledStamps(props.hero.required_stamps) : 0,
)
const progressSlots = computed(() =>
  props.hero ? Math.min(Math.max(props.hero.required_stamps, 1), 10) : 0,
)
const stampsToGo = computed(() =>
  props.hero ? Math.max(props.hero.required_stamps - filledStamps.value, 0) : 0,
)
const categoryIcon = computed<Component>(() => {
  const value = (props.category ?? '').toLowerCase()
  if (value === 'cafe' || value === 'coffee') return Coffee
  if (value === 'bar') return Wine
  if (value === 'bakery') return Croissant
  if (value === 'restaurant') return UtensilsCrossed
  return Gift
})
</script>

<template>
  <div
    class="overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-[0_12px_40px_-24px_rgba(5,13,30,0.12)]"
  >
    <div class="flex items-start gap-4">
      <div
        class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-accent-border/30 bg-accent-soft"
      >
        <img
          v-if="hero?.image_thumb || hero?.image"
          :src="rewardThumbUrl(hero)"
          alt=""
          class="size-full object-cover"
        >
        <component
          :is="categoryIcon"
          v-else
          class="size-6 text-accent"
          aria-hidden="true"
        />
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-lg font-black leading-snug text-ink">
          {{ rewardLine }}
        </p>
        <p class="mt-1.5 text-sm leading-relaxed text-ink-muted">
          {{ subtitle }}
        </p>

        <div v-if="hero" class="mt-4">
          <div class="flex gap-1">
            <span
              v-for="index in progressSlots"
              :key="index"
              class="h-1.5 flex-1 rounded-full"
              :class="index <= filledStamps ? 'bg-progress-filled' : 'bg-progress-track'"
              aria-hidden="true"
            />
          </div>
          <p class="mt-2.5 text-sm font-semibold text-ink">
            {{ stampsToGo === 1 ? '1 stamp to unlock' : `${stampsToGo} stamps to unlock` }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
