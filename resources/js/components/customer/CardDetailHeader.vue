<script setup lang="ts">
import { computed } from 'vue'

import { formatVenueCategoryLabel } from '@/lib/venueScanLanding'
import { venueCoverUrl } from '@/lib/venueMedia'
import type { Venue } from '@/types'

const props = defineProps<{
  venue?: Venue | null
}>()

const cover = computed(() => (props.venue ? venueCoverUrl(props.venue) : null))
const categoryLabel = computed(() => formatVenueCategoryLabel(props.venue?.category))
const subtitle = computed(() => {
  const parts = [props.venue?.address?.trim(), categoryLabel.value].filter(Boolean)
  return parts.join(' · ')
})
</script>

<template>
  <div>
    <div class="h-[200px] overflow-hidden rounded-[22px] bg-surface-muted">
      <img
        v-if="cover"
        :src="cover"
        alt=""
        class="size-full object-cover"
      >
    </div>
    <div class="pt-4 pb-0.5">
      <h1 class="text-[30px] font-extrabold leading-tight tracking-tight text-ink">
        {{ venue?.name ?? 'Loyalty card' }}
      </h1>
      <p
        v-if="subtitle"
        class="mt-1.5 text-sm font-medium text-ink-muted"
      >
        {{ subtitle }}
      </p>
    </div>
  </div>
</template>
