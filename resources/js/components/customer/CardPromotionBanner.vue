<script setup lang="ts">
import { ChevronRight, Zap } from '@lucide/vue'

import type { VenuePromotion } from '@/types'

defineProps<{
  promotion: VenuePromotion
}>()
</script>

<template>
  <div class="mt-3.5 flex items-center gap-3 rounded-2xl border border-accent-border bg-accent-soft px-3.5 py-3">
    <div class="grid size-9 shrink-0 place-items-center rounded-full bg-bg">
      <Zap class="size-[18px] text-accent-active" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-[15px] font-extrabold text-ink">{{ promotion.headline }}</p>
      <p class="mt-0.5 line-clamp-2 text-sm font-medium text-ink-muted">{{ promotion.message }}</p>
    </div>
    <ChevronRight class="size-4 shrink-0 text-ink-soft" />
  </div>
</template>
