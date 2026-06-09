<script setup lang="ts">
import { Calendar, Clock, Sparkles, Star, Zap } from '@lucide/vue'
import { computed } from 'vue'

import { campaignEndsLabel } from '@/lib/campaignEndsLabel'
import { venueCoverUrl } from '@/lib/venueMedia'
import type { HomeCampaign, Venue } from '@/types'

const props = defineProps<{
  campaign: HomeCampaign
  featured?: boolean
  venue?: Venue | null
}>()

const endsLabel = computed(() => campaignEndsLabel(props.campaign.days_left))
const cover = computed(() => venueCoverUrl(props.venue ?? { name: props.campaign.venue_name }))
const title = computed(() => props.campaign.name?.trim() || props.campaign.headline)
const isDarkCampaign = computed(() => props.featured || props.campaign.applies_now)
</script>

<template>
  <article
    v-if="isDarkCampaign"
    class="relative min-h-[176px] overflow-hidden rounded-[22px] border border-campaign-border bg-campaign shadow-md"
    :class="featured ? 'min-h-[204px]' : ''"
  >
    <div class="flex h-full gap-3 p-[18px]">
      <div class="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <span
            class="inline-flex items-center gap-1 rounded-full border border-accent px-2.5 py-1 text-[11px] font-bold text-accent"
          >
            <Star v-if="featured" class="size-3" />
            <Zap v-else class="size-3" />
            {{ featured ? 'Featured' : 'Active' }}
          </span>
          <p class="mt-3 truncate text-xs font-semibold tracking-wide text-white/65">
            {{ campaign.venue_name }}
          </p>
          <p
            class="mt-1.5 font-extrabold leading-snug tracking-tight text-primary-text"
            :class="featured ? 'text-xl' : 'text-lg'"
          >
            {{ title }}
          </p>
          <p class="mt-1.5 line-clamp-2 text-[13px] font-medium leading-[19px] text-white/75">
            {{ campaign.message }}
          </p>
        </div>
        <p
          v-if="endsLabel"
          class="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-accent"
        >
          <Clock class="size-3.5" />
          {{ endsLabel }}
        </p>
      </div>

      <div class="relative flex w-[104px] shrink-0 items-center justify-center">
        <img
          v-if="cover"
          :src="cover"
          alt=""
          class="size-[92px] rounded-2xl border border-white/15 object-cover"
        >
        <div
          v-else
          class="size-[92px] rounded-2xl border border-white/10 bg-white/5"
        />
        <div class="absolute -right-3 -top-2 grid size-[52px] place-items-center rounded-full border-2 border-accent-border bg-campaign shadow-sm">
          <span class="text-sm font-black leading-none text-accent">{{ campaign.multiplier }}×</span>
          <span class="text-[7px] font-extrabold tracking-[0.08em] text-white/70">STAMPS</span>
        </div>
      </div>
    </div>
  </article>

  <article
    v-else
    class="min-h-[176px] rounded-[22px] border border-border bg-surface p-[18px] shadow-md"
  >
    <span class="inline-flex items-center gap-1 rounded-full border border-highlight-border bg-highlight px-2.5 py-1 text-[11px] font-bold text-ink">
      <Sparkles class="size-3" />
      New
    </span>
    <p class="mt-2.5 truncate text-xs font-semibold tracking-wide text-ink-muted">
      {{ campaign.venue_name }}
    </p>
    <p class="mt-1.5 text-lg font-extrabold leading-snug tracking-tight text-ink">
      {{ title }}
    </p>
    <p class="mt-1.5 line-clamp-2 text-[13px] font-medium leading-[19px] text-ink-muted">
      {{ campaign.message }}
    </p>
    <p
      v-if="endsLabel"
      class="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted"
    >
      <Calendar class="size-3.5 text-ink-soft" />
      {{ endsLabel }}
    </p>
  </article>
</template>
