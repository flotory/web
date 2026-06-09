<script setup lang="ts">
export type DiscoverCategoryFilter = 'all' | 'coffee' | 'food' | 'desserts' | 'more'

defineProps<{
  modelValue: DiscoverCategoryFilter
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DiscoverCategoryFilter]
}>()

const pills: Array<{ id: DiscoverCategoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'food', label: 'Food' },
  { id: 'desserts', label: 'Desserts' },
  { id: 'more', label: 'More' },
]
</script>

<template>
  <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
    <button
      v-for="pill in pills"
      :key="pill.id"
      type="button"
      class="shrink-0 rounded-full px-4 py-2 text-sm font-bold transition"
      :class="modelValue === pill.id
        ? 'bg-ink text-primary-text'
        : 'border border-border bg-surface-muted text-ink-muted hover:text-ink'"
      @click="emit('update:modelValue', pill.id)"
    >
      {{ pill.label }}
    </button>
  </div>
</template>
