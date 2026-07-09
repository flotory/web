<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { computed, useAttrs } from 'vue'

import { cn } from '@/lib/utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    id?: string
    modelValue?: string
    disabled?: boolean
    size?: 'default' | 'compact'
    variant?: 'default' | 'sidebar'
    centered?: boolean
    hideChevron?: boolean
  }>(),
  {
    disabled: false,
    size: 'default',
    variant: 'default',
    centered: false,
    hideChevron: false,
  },
)

const emit = defineEmits<{
  change: [event: Event]
  'update:modelValue': [value: string]
}>()

const attrs = useAttrs()

const isSidebar = computed(() => props.variant === 'sidebar')

const wrapperClass = computed(() => {
  if (isSidebar.value) {
    return cn(
      'group relative w-full transition focus-within:ring-2 focus-within:ring-accent/25',
      props.size === 'compact' ? 'h-10 rounded-xl' : 'h-10 rounded-2xl',
      'border border-accent/45 bg-sidebar-hover focus-within:border-accent',
      props.disabled ? 'opacity-60' : '',
      attrs.class,
    )
  }

  return cn(
    'group flex items-stretch overflow-hidden border border-border bg-surface transition focus-within:border-ink-soft',
    props.size === 'compact' ? 'h-10 rounded-xl' : 'h-12 rounded-2xl',
    props.disabled ? 'opacity-60' : '',
    attrs.class,
  )
})

const chevronClass = computed(() => (
  props.size === 'compact' ? 'w-9' : 'w-10'
))

const selectClass = computed(() => {
  if (isSidebar.value) {
    return cn(
      'h-full w-full min-w-0 cursor-pointer appearance-none border-0 bg-transparent py-0 pl-3.5 pr-9 text-sm font-semibold text-sidebar-text outline-none disabled:cursor-not-allowed',
    )
  }

  const base = 'min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent py-0 text-sm font-semibold text-ink outline-none disabled:cursor-not-allowed'

  if (props.centered) {
    return cn(
      base,
      props.hideChevron ? 'w-full px-3 text-center text-lg leading-none' : 'px-2 text-center text-lg leading-none',
    )
  }

  return cn(base, 'pl-3 pr-2')
})

const sidebarChevronClass = computed(() => cn(
  'pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-sidebar-text-muted transition group-focus-within:text-sidebar-text',
))

function onChange(event: Event) {
  emit('change', event)
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div :class="wrapperClass">
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled"
      :class="selectClass"
      v-bind="{ ...attrs, class: undefined }"
      @change="onChange"
    >
      <slot />
    </select>

    <ChevronDown
      v-if="isSidebar"
      :class="sidebarChevronClass"
      stroke-width="2.25"
      aria-hidden="true"
    />

    <div
      v-else-if="!hideChevron"
      class="pointer-events-none flex shrink-0 items-center justify-center border-l border-border/70 bg-surface-muted text-ink-muted transition group-focus-within:border-ink-soft/50"
      :class="chevronClass"
      aria-hidden="true"
    >
      <ChevronDown class="size-4" stroke-width="2.25" />
    </div>
  </div>
</template>
