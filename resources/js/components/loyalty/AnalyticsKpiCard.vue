<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  description: string
}>()
</script>

<template>
  <div class="flex h-full min-h-[8.5rem] flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
    <p class="text-sm font-semibold text-slate-500">{{ label }}</p>
    <p class="mt-3 text-4xl font-black tabular-nums tracking-tight text-slate-950">
      {{ value }}
    </p>
    <p class="mt-auto pt-3 text-sm leading-snug text-slate-500">
      {{ description }}
    </p>
  </div>
</template>
