<script setup lang="ts">
import { MapPin } from '@lucide/vue'
import { computed } from 'vue'

import { buildGoogleMapsSearchUrl, hasVenueAddress } from '@/lib/googleMaps'

const props = defineProps<{
  address?: string | null
  compact?: boolean
}>()

const visible = computed(() => hasVenueAddress(props.address))
const mapsUrl = computed(() => buildGoogleMapsSearchUrl(props.address ?? ''))
</script>

<template>
  <div
    v-if="visible"
    class="rounded-2xl border border-border/80 bg-surface/90 shadow-sm shadow-border/30"
    :class="compact ? 'p-3.5' : 'p-4'"
  >
    <div class="flex items-start gap-2.5">
      <MapPin class="mt-0.5 size-4 shrink-0 text-rose-500" :stroke-width="2.2" aria-hidden="true" />
      <p class="min-w-0 flex-1 text-sm font-medium leading-snug text-ink-muted">
        {{ address?.trim() }}
      </p>
    </div>
    <a
      :href="mapsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full bg-surface px-4 text-sm font-semibold text-ink border border-border transition hover:bg-surface-muted sm:w-auto"
    >
      Open in Maps
    </a>
  </div>
</template>
