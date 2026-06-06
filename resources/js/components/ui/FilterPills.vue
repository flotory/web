<script setup lang="ts" generic="T extends string">
defineProps<{
  modelValue: T
  options: Array<{ id: T; label: string }>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="option in options"
      :key="option.id"
      type="button"
      class="rounded-full px-3.5 py-1.5 text-sm font-semibold transition"
      :class="
        modelValue === option.id
          ? 'bg-primary text-primary-text shadow-sm'
          : 'bg-surface text-ink-muted ring-1 ring-border hover:bg-surface-muted hover:text-ink'
      "
      @click="emit('update:modelValue', option.id)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
