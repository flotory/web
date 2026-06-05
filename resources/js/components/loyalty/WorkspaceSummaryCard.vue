<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
}>()
</script>

<template>
  <div class="rounded-2xl border border-border/80 bg-surface px-4 py-4 text-center shadow-sm shadow-border/30">
    <p class="text-3xl font-black tabular-nums tracking-tight text-ink">{{ value }}</p>
    <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{{ label }}</p>
  </div>
</template>
