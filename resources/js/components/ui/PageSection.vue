<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div :class="description ? 'mb-4' : 'mb-3'">
    <h2 class="text-lg font-bold tracking-tight text-ink md:text-xl">{{ title }}</h2>
    <p v-if="description" class="mt-1 max-w-2xl text-sm text-ink-muted">{{ description }}</p>
  </div>
</template>
