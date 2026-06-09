<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import WalletMilestoneSlots from '@/components/customer/WalletMilestoneSlots.vue'
import { walletMilestoneProgress } from '@/lib/walletMilestoneProgress'
import { formatVenueCategoryLabel } from '@/lib/venueScanLanding'
import { venueCoverUrl } from '@/lib/venueMedia'
import type { Customer } from '@/types'

const props = defineProps<{
  item: Customer
}>()

const router = useRouter()

const progress = computed(() => walletMilestoneProgress(props.item.summary, props.item.stamps))
const cover = computed(() => (props.item.venue ? venueCoverUrl(props.item.venue) : null))
const categoryLabel = computed(() => formatVenueCategoryLabel(props.item.venue?.category) ?? 'Venue')

function openCard() {
  router.push({
    name: 'customer-card',
    params: { cardId: String(props.item.id) },
    query: { venue_id: String(props.item.venue_id) },
  })
}
</script>

<template>
  <button
    type="button"
    class="block w-full overflow-hidden rounded-3xl text-left shadow-[0_12px_40px_-24px_rgba(5,13,30,0.25)] transition hover:scale-[1.01]"
    @click="openCard"
  >
    <div class="relative h-[168px] overflow-hidden rounded-3xl bg-primary">
      <img
        v-if="cover"
        :src="cover"
        alt=""
        class="absolute inset-0 size-full object-cover"
      >
      <div class="absolute inset-0 bg-primary/72" />

      <div class="relative flex h-full flex-col justify-between p-3.5">
        <div>
          <p class="truncate text-[22px] font-extrabold leading-tight tracking-tight text-primary-text">
            {{ item.venue?.name ?? 'Venue' }}
          </p>
          <p class="mt-0.5 text-[13px] font-semibold text-white/80">
            {{ categoryLabel }}
          </p>
        </div>

        <div class="flex items-end justify-between gap-3">
          <div class="min-w-0 flex-1 pr-2">
            <p class="text-sm font-bold text-white/90">
              <span class="text-lg font-extrabold text-accent">{{ progress.current }}</span>
              {{ ` / ${progress.target} stamps` }}
            </p>
            <WalletMilestoneSlots
              :filled="progress.current"
              :milestone-stamp="progress.milestoneStamp"
            />
          </div>
          <div class="shrink-0 text-right">
            <p class="text-[32px] font-extrabold leading-none text-accent">{{ progress.toNext }}</p>
            <p class="text-xs font-semibold text-white/75">
              {{ progress.toNext === 1 ? 'stamp to go' : 'stamps to go' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </button>
</template>
