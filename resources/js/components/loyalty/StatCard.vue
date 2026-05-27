<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  hint?: string
}>()
</script>

<template>
  <div class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
    <p class="text-sm font-medium text-slate-500">{{ label }}</p>
    <p class="mt-3 text-3xl font-bold tracking-tight text-slate-950">{{ value }}</p>
    <p v-if="hint" class="mt-2 text-xs font-medium text-emerald-600">{{ hint }}</p>
  </div>
</template>
