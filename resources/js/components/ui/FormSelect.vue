<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'

withDefaults(
  defineProps<{
    id?: string
    modelValue?: string
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

defineEmits<{
  change: [event: Event]
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div
    class="group flex h-12 items-stretch overflow-hidden rounded-2xl border border-border bg-surface transition focus-within:border-ink-soft"
    :class="disabled ? 'opacity-60' : ''"
  >
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      class="min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent py-0 pl-4 pr-3 text-sm font-medium text-ink outline-none disabled:cursor-not-allowed"
      @change="$emit('change', $event)"
    >
      <slot />
    </select>
    <div
      class="pointer-events-none flex w-10 shrink-0 items-center justify-center border-l border-border/70 bg-surface-muted text-ink-muted transition group-focus-within:border-ink-soft/50"
      aria-hidden="true"
    >
      <ChevronDown class="size-4" stroke-width="2.25" />
    </div>
  </div>
</template>
