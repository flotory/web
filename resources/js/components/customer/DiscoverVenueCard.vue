<script setup lang="ts">
import { CheckCircle, ChevronRight, Coffee, Gift, IceCreamCone, MapPin, Ribbon, Store, Ticket, Wine } from '@lucide/vue'
import { computed } from 'vue'

import { discoverVenuePill } from '@/lib/discoverVenuePill'
import { formatVenueCategoryLabel } from '@/lib/venueScanLanding'
import { venueCoverUrl } from '@/lib/venueMedia'
import type { Customer, Venue } from '@/types'

const props = defineProps<{
  venue: Venue
  card?: Customer | null
  distanceLabel?: string | null
}>()

const emit = defineEmits<{
  press: []
}>()

const cover = computed(() => venueCoverUrl(props.venue))
const categoryLabel = computed(() => formatVenueCategoryLabel(props.venue.category) ?? 'Venue')
const joined = computed(() => (props.venue.joined_count ?? 0) > 0)
const status = computed(() => discoverVenuePill(joined.value, props.venue.rewards_count, props.card))

const pillClass = computed(() => {
  if (status.value.tone === 'ready') return 'bg-success-bg border-success-border text-success-text'
  if (status.value.tone === 'progress') return 'bg-accent-soft border-accent-border text-ink'
  return 'bg-surface-muted border-border text-ink-muted'
})

const pillIcon = computed(() => {
  if (status.value.tone === 'ready') return Gift
  if (status.value.tone === 'progress') return Ticket
  return Ribbon
})

const categoryIcon = computed(() => {
  const key = (props.venue.category ?? '').toLowerCase()
  if (key === 'cafe') return Coffee
  if (key === 'bar') return Wine
  if (key === 'bakery') return IceCreamCone
  if (key === 'restaurant') return Store
  return Store
})
</script>

<template>
  <button
    type="button"
    class="flex w-full gap-3.5 rounded-[22px] border border-border bg-surface p-3.5 text-left shadow-sm transition hover:border-accent-border"
    @click="emit('press')"
  >
    <div class="size-24 shrink-0 overflow-hidden rounded-2xl bg-surface-muted">
      <img
        v-if="cover"
        :src="cover"
        alt=""
        class="size-full object-cover"
      >
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-start gap-2">
        <div class="grid size-9 shrink-0 place-items-center rounded-full bg-surface-muted">
          <component :is="categoryIcon" class="size-4 text-ink" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[17px] font-extrabold text-ink">{{ venue.name }}</p>
          <p class="mt-0.5 truncate text-sm text-ink-muted">
            {{ distanceLabel ?? categoryLabel }}
          </p>
          <p
            v-if="distanceLabel"
            class="mt-0.5 truncate text-xs text-ink-soft"
          >
            {{ categoryLabel }}
          </p>
        </div>
      </div>

      <div class="mt-2.5 flex flex-wrap items-center gap-2">
        <span
          v-if="joined"
          class="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-bold text-ink"
        >
          <CheckCircle class="size-3.5 text-accent-active" />
          Joined
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold"
          :class="pillClass"
        >
          <component :is="pillIcon" class="size-3" />
          {{ status.label }}
        </span>
      </div>

      <p
        v-if="venue.address"
        class="mt-2 flex items-center gap-1 truncate text-xs text-ink-soft"
      >
        <MapPin class="size-3 shrink-0" />
        {{ venue.address }}
      </p>
    </div>

    <ChevronRight class="mt-2 size-4 shrink-0 self-start text-ink-soft" />
  </button>
</template>
