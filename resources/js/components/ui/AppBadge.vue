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
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1',
      {
        slate: 'bg-surface-muted text-ink-muted ring-border',
        green: 'bg-success-bg text-success-text ring-success-border',
        blue: 'bg-accent-soft text-primary ring-accent-border',
        amber: 'bg-highlight text-accent-active ring-highlight-border',
      }[tone],
    ]"
  >
    <slot />
  </span>
</template>
