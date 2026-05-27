<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'

const workspace = useWorkspaceStore()
</script>

<template>
  <div v-if="workspace.activeVenues.length > 1" class="flex flex-wrap items-center gap-2">
    <label class="text-xs font-bold uppercase tracking-wide text-slate-400">Venue</label>
    <select
      :value="workspace.filterVenueId ?? 'all'"
      class="h-10 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
      @change="workspace.setFilter(($event.target as HTMLSelectElement).value === 'all' ? null : Number(($event.target as HTMLSelectElement).value))"
    >
      <option value="all">All venues</option>
      <option v-for="venue in workspace.activeVenues" :key="venue.id" :value="venue.id">
        {{ venue.name }}
      </option>
    </select>
  </div>
</template>
