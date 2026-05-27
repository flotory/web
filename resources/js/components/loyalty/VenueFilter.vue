<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'

const workspace = useWorkspaceStore()

const selectStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundPosition: 'right 0.65rem center',
}
</script>

<template>
  <div v-if="workspace.activeVenues.length > 1" class="flex flex-wrap items-center gap-2">
    <label class="text-xs font-bold uppercase tracking-wide text-slate-400">Venue</label>
    <select
      :value="workspace.filterVenueId ?? 'all'"
      class="h-10 min-w-[180px] appearance-none rounded-xl border border-slate-200 bg-white bg-[length:14px_14px] bg-no-repeat px-3 pr-9 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
      :style="selectStyle"
      @change="workspace.setFilter(($event.target as HTMLSelectElement).value === 'all' ? null : Number(($event.target as HTMLSelectElement).value))"
    >
      <option value="all">All venues</option>
      <option v-for="venue in workspace.activeVenues" :key="venue.id" :value="venue.id">
        {{ venue.name }}
      </option>
    </select>
  </div>
</template>
