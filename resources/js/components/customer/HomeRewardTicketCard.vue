<script setup lang="ts">
import { ChevronRight, Gift, QrCode } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { visitsToRewardCopy } from '@/lib/progressCopy'
import { rewardThumbUrl } from '@/lib/rewardMedia'
import { venueLogoThumbUrl } from '@/lib/venueMedia'
import type { Customer, Reward } from '@/types'
import type { Venue } from '@/types'

const props = defineProps<{
  variant: 'ready' | 'next'
  title: string
  venue?: Venue | null
  imageReward?: Pick<Reward, 'title' | 'image' | 'image_thumb'> | null
  unlockId?: number
  cardId?: number
  venueId?: number
  stampsToGo?: number | null
  stampProgress?: { collected: number; target: number } | null
}>()

const emit = defineEmits<{
  claimUnavailable: []
}>()

const imageUrl = computed(() => {
  if (props.imageReward) {
    return rewardThumbUrl(props.imageReward)
  }
  return props.venue ? venueLogoThumbUrl(props.venue) : null
})

const claimTo = computed(() => (props.unlockId ? `/claim/${props.unlockId}` : null))
const cardTo = computed(() =>
  props.cardId && props.venueId
    ? { name: 'customer-card' as const, params: { cardId: String(props.cardId) }, query: { venue_id: String(props.venueId) } }
    : null,
)

const progressSlots = computed(() =>
  props.stampProgress ? Math.min(Math.max(props.stampProgress.target, 1), 10) : 0,
)
const filledStamps = computed(() =>
  props.stampProgress ? Math.min(Math.max(props.stampProgress.collected, 0), progressSlots.value) : 0,
)
</script>

<template>
  <div
    class="overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_12px_40px_-24px_rgba(5,13,30,0.12)]"
    :class="variant === 'ready' ? 'border-l-4 border-l-reward-ready' : ''"
  >
    <div class="p-5">
      <div class="flex items-start gap-4">
        <div class="grid size-[88px] shrink-0 place-items-center overflow-hidden rounded-full bg-bg">
          <img
            v-if="imageUrl && variant === 'next'"
            :src="imageUrl"
            alt=""
            class="size-full object-cover"
          >
          <Gift
            v-else-if="variant === 'ready'"
            class="size-10 text-accent"
          />
          <img
            v-else-if="imageUrl"
            :src="imageUrl"
            alt=""
            class="size-full object-cover"
          >
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">
            {{ variant === 'ready' ? 'Ready to claim' : venue?.name ?? 'Your progress' }}
          </p>
          <p class="mt-1 text-lg font-black leading-snug text-ink">
            {{ title }}
          </p>
          <p
            v-if="variant === 'next' && stampsToGo != null"
            class="mt-1.5 text-sm font-semibold text-ink-muted"
          >
            {{ visitsToRewardCopy(stampsToGo, title) }}
          </p>
        </div>
      </div>

      <div v-if="stampProgress" class="mt-4">
        <div class="flex gap-1">
          <span
            v-for="index in progressSlots"
            :key="index"
            class="h-1.5 flex-1 rounded-full"
            :class="index <= filledStamps ? 'bg-progress-filled' : 'bg-progress-track'"
          />
        </div>
        <div class="mt-2.5 flex items-center justify-between text-sm">
          <span class="font-bold text-ink-muted">{{ filledStamps }} of {{ stampProgress.target }} visits</span>
          <span class="font-extrabold text-ink">
            {{ stampProgress.target - filledStamps <= 0 ? 'Ready to claim' : `${stampProgress.target - filledStamps} visits to go` }}
          </span>
        </div>
      </div>

      <RouterLink
        v-if="variant === 'ready' && claimTo"
        :to="claimTo"
        class="mt-4 inline-flex items-center gap-2 rounded-full border border-accent-border px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-accent-soft"
        @click="emit('claimUnavailable')"
      >
        <QrCode class="size-4 text-accent-active" />
        Show claim QR
        <ChevronRight class="size-4 text-ink-soft" />
      </RouterLink>

      <RouterLink
        v-else-if="variant === 'next' && cardTo"
        :to="cardTo"
        class="mt-4 inline-flex items-center gap-2 rounded-full border border-accent-border px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-accent-soft"
      >
        View card
        <ChevronRight class="size-4 text-ink-soft" />
      </RouterLink>
    </div>
  </div>
</template>
