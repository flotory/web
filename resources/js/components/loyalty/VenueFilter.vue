<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'

withDefaults(
  defineProps<{
    variant?: 'default' | 'sidebar'
  }>(),
  {
    variant: 'default',
  },
)

const workspace = useWorkspaceStore()

const selectStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundPosition: 'right 0.65rem center',
}

const sidebarSelectStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239AA6BE' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundPosition: 'right 0.65rem center',
}
</script>

<template>
  <div v-if="workspace.activeVenues.length > 1" class="flex flex-col gap-1.5">
    <label
      :class="[
        'text-[11px] font-bold uppercase tracking-[0.14em]',
        variant === 'sidebar' ? 'text-sidebar-text-muted' : 'text-ink-soft',
      ]"
    >
      Venue
    </label>
    <select
      :value="workspace.filterVenueId ?? workspace.activeVenues[0]?.id"
      :class="[
        'h-10 w-full appearance-none rounded-xl border bg-[length:14px_14px] bg-no-repeat px-3 pr-9 text-sm font-semibold outline-none transition',
        variant === 'sidebar'
          ? 'border-sidebar-border bg-sidebar-hover text-sidebar-text focus:border-accent'
          : 'border-border bg-surface text-ink-muted focus:border-ink-soft',
      ]"
      :style="variant === 'sidebar' ? sidebarSelectStyle : selectStyle"
      @change="workspace.setFilter(Number(($event.target as HTMLSelectElement).value))"
    >
      <option v-for="venue in workspace.activeVenues" :key="venue.id" :value="venue.id">
        {{ venue.name }}
      </option>
    </select>
  </div>
</template>
