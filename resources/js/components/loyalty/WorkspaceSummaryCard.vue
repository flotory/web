<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
}>()
</script>

<template>
  <div class="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 text-center shadow-sm shadow-slate-200/30">
    <p class="text-3xl font-black tabular-nums tracking-tight text-slate-950">{{ value }}</p>
    <p class="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{{ label }}</p>
  </div>
</template>
