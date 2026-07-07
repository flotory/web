<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    id?: string
    modelValue?: string
    disabled?: boolean
    size?: 'default' | 'compact'
  }>(),
  {
    disabled: false,
    size: 'default',
  },
)

const emit = defineEmits<{
  change: [event: Event]
  'update:modelValue': [value: string]
}>()

const wrapperClass = computed(() => (
  props.size === 'compact'
    ? 'h-10 rounded-xl'
    : 'h-12 rounded-2xl'
))

const chevronClass = computed(() => (
  props.size === 'compact' ? 'w-9' : 'w-10'
))

function onChange(event: Event) {
  emit('change', event)
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div
    class="group flex items-stretch overflow-hidden border border-border bg-surface transition focus-within:border-ink-soft"
    :class="[wrapperClass, disabled ? 'opacity-60' : '']"
  >
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      class="min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent py-0 pl-3 pr-2 text-sm font-semibold text-ink outline-none disabled:cursor-not-allowed"
      @change="onChange"
    >
      <slot />
    </select>
    <div
      class="pointer-events-none flex shrink-0 items-center justify-center border-l border-border/70 bg-surface-muted text-ink-muted transition group-focus-within:border-ink-soft/50"
      :class="chevronClass"
      aria-hidden="true"
    >
      <ChevronDown class="size-4" stroke-width="2.25" />
    </div>
  </div>
</template>
