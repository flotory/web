<script setup lang="ts">
import { Check, Circle } from '@lucide/vue'
import { RouterLink } from 'vue-router'

import type { VenueListingSnapshot } from '@/lib/venueListing'
import { listingItemPath } from '@/lib/venueListing'

withDefaults(defineProps<{
  items: VenueListingSnapshot['items']
  venueId?: number
  variant?: 'owner' | 'admin'
}>(), {
  venueId: undefined,
  variant: 'owner',
})
</script>

<template>
  <ul
    v-if="variant === 'admin'"
    class="grid gap-2 sm:grid-cols-2"
  >
    <li
      v-for="item in items"
      :key="item.key"
      class="rounded-xl bg-surface-muted px-3 py-2 text-sm font-medium"
      :class="item.complete ? 'text-ink' : 'text-danger'"
    >
      {{ item.complete ? '✓' : '○' }} {{ item.label }}
    </li>
  </ul>

  <ul
    v-else
    class="space-y-3"
  >
    <li
      v-for="item in items"
      :key="item.key"
      class="flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface-muted/70 px-4 py-3"
    >
      <div class="flex min-w-0 items-start gap-3">
        <component
          :is="item.complete ? Check : Circle"
          class="mt-0.5 size-4 shrink-0"
          :class="item.complete ? 'text-success' : 'text-ink-soft'"
        />
        <div class="min-w-0">
          <p class="text-sm font-bold text-ink">{{ item.label }}</p>
          <p v-if="!item.complete" class="mt-1 text-xs font-medium text-ink-muted">{{ item.hint }}</p>
        </div>
      </div>
      <RouterLink
        v-if="!item.complete && venueId"
        :to="listingItemPath(venueId, item.key)"
        class="shrink-0 text-xs font-bold text-primary-soft hover:text-primary"
      >
        Add
      </RouterLink>
    </li>
  </ul>
</template>
