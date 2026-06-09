<script setup lang="ts">
import { ChevronRight, Compass, QrCode, Wallet } from '@lucide/vue'
import { RouterLink } from 'vue-router'

defineProps<{
  actions: Array<{
    id: string
    label: string
    subtitle: string
    to: string
    tint: string
  }>
}>()

const iconMap: Record<string, typeof QrCode> = {
  scan: QrCode,
  wallet: Wallet,
  venues: Compass,
}
</script>

<template>
  <div>
    <h2 class="text-lg font-extrabold text-ink">Quick actions</h2>
    <ul class="mt-3 space-y-2.5">
      <li
        v-for="action in actions"
        :key="action.id"
      >
        <RouterLink
          :to="action.to"
          class="flex items-center gap-3 rounded-[22px] border border-border bg-surface p-3.5 shadow-sm transition hover:bg-surface-muted/60"
        >
          <div
            :class="['grid size-11 shrink-0 place-items-center rounded-2xl', action.tint]"
          >
            <component
              :is="iconMap[action.id] ?? QrCode"
              class="size-5 text-accent-active"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-extrabold text-ink">{{ action.label }}</p>
            <p class="text-sm text-ink-muted">{{ action.subtitle }}</p>
          </div>
          <ChevronRight class="size-4 shrink-0 text-ink-soft" />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
