<script setup lang="ts">
import { Bell } from '@lucide/vue'
import { RouterLink } from 'vue-router'

defineProps<{
  pretitle: string
  title?: string
  subtitle?: string
}>()
</script>

<template>
  <div class="flex items-start justify-between gap-4 pt-2">
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold text-ink-muted">{{ pretitle }}</p>
      <h1
        v-if="title"
        class="mt-1 text-2xl font-black leading-tight tracking-tight text-ink"
      >
        {{ title }}
      </h1>
      <p
        v-if="subtitle"
        class="mt-1 text-sm text-ink-muted"
      >
        {{ subtitle }}
      </p>
    </div>

    <RouterLink
      to="/customer/notifications"
      class="grid size-10 shrink-0 place-items-center rounded-2xl border border-border bg-surface shadow-sm transition hover:bg-surface-muted"
      aria-label="Notifications"
    >
      <Bell class="size-5 text-ink" />
    </RouterLink>
  </div>
</template>
