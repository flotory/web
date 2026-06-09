<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { RouterLink } from 'vue-router'

import CustomerScreen from '@/components/customer/CustomerScreen.vue'
import AppShell from '@/layouts/AppShell.vue'

</script>

<template>
  <AppShell>
    <CustomerScreen>
      <div class="mx-auto w-full max-w-md">
        <RouterLink
          to="/home"
          class="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-muted hover:text-ink"
        >
          <ArrowLeft class="size-4" />
          Back
        </RouterLink>

        <h1 class="text-2xl font-black text-ink">Notifications</h1>

        <div class="mt-8 rounded-[22px] border border-border bg-surface p-6 text-center shadow-sm">
          <p class="text-3xl">🔔</p>
          <p class="mt-3 text-lg font-extrabold text-ink">You're all caught up</p>
          <p class="mt-2 text-sm text-ink-muted">
            Push notifications are coming soon. We'll let you know when rewards are ready and campaigns go live.
          </p>
        </div>
      </div>
    </CustomerScreen>
  </AppShell>
</template>
