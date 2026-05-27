<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useWorkspaceStore } from '@/stores/workspace'

const router = useRouter()
const workspace = useWorkspaceStore()

onMounted(() => workspace.bootstrap())
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="blue">Workspace settings</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Settings</h1>
      <p class="mt-2 text-slate-500">Manage each venue from its own settings page.</p>
    </div>

    <AppCard>
      <h2 class="text-xl font-black text-slate-950">Your venues</h2>
      <div class="mt-4 space-y-2">
        <div
          v-for="venue in workspace.activeVenues"
          :key="venue.id"
          class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <div>
            <p class="font-black text-slate-950">{{ venue.name }}</p>
            <p class="text-sm font-semibold text-slate-500">/{{ venue.slug }}</p>
          </div>
          <AppButton variant="secondary" size="sm" @click="router.push(`/my-venues/${venue.id}/settings`)">
            Edit venue
          </AppButton>
        </div>
        <p v-if="!workspace.activeVenues.length" class="text-sm font-semibold text-slate-500">No venues yet.</p>
      </div>
    </AppCard>
  </AppShell>
</template>
