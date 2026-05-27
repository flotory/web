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
        slate: 'bg-slate-100 text-slate-700 ring-slate-200',
        green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        blue: 'bg-blue-50 text-blue-700 ring-blue-100',
        amber: 'bg-amber-50 text-amber-700 ring-amber-100',
      }[tone],
    ]"
  >
    <slot />
  </span>
</template>
