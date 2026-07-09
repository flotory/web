<script setup lang="ts">
import FormSelect from '@/components/ui/FormSelect.vue'
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

function onVenueChange(value: string) {
  workspace.setFilter(Number(value))
}
</script>

<template>
  <div v-if="workspace.activeVenues.length > 1" class="flex flex-col gap-1.5">
    <label
      :class="[
        'text-[11px] font-bold uppercase tracking-[0.14em]',
        variant === 'sidebar' ? 'text-sidebar-text-muted' : 'text-ink-soft',
      ]"
      :for="variant === 'sidebar' ? 'workspace-venue-filter-sidebar' : 'workspace-venue-filter'"
    >
      Venue
    </label>
    <FormSelect
      :id="variant === 'sidebar' ? 'workspace-venue-filter-sidebar' : 'workspace-venue-filter'"
      :variant="variant === 'sidebar' ? 'sidebar' : 'default'"
      size="compact"
      :model-value="String(workspace.filterVenueId ?? workspace.activeVenues[0]?.id ?? '')"
      @update:model-value="onVenueChange"
    >
      <option v-for="venue in workspace.activeVenues" :key="venue.id" :value="venue.id">
        {{ venue.name }}
      </option>
    </FormSelect>
  </div>
</template>
