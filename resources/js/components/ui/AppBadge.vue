<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'slate' | 'green' | 'blue' | 'amber'
  }>(),
  {
    tone: 'slate',
  },
)
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
      {
        slate: 'bg-surface-muted text-ink-muted',
        green: 'bg-success-bg text-success-text',
        blue: 'bg-accent-soft text-primary',
        amber: 'bg-highlight text-accent-active',
      }[tone],
    ]"
  >
    <slot />
  </span>
</template>
