<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useWorkspaceStore } from '@/stores/workspace'

const router = useRouter()
const workspace = useWorkspaceStore()

const ownerVenues = computed(() => workspace.activeVenues.filter((item) => item.membership_role === 'owner'))

onMounted(() => {
  void workspace.bootstrap()
})
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="blue">Workspace settings</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Settings</h1>
      <p class="mt-2 text-slate-500">Venue details and branding.</p>
    </div>

    <AppCard>
      <h2 class="text-xl font-black text-slate-950">Your venues</h2>
      <p class="mt-2 text-sm font-semibold text-slate-500">Logo, address, QR codes, and loyalty setup per venue.</p>
      <p class="mt-3 text-sm font-semibold text-slate-500">
        Invite staff from the
        <RouterLink to="/team" class="font-black text-slate-950 underline">Team</RouterLink>
        page — we email them a secure link.
      </p>
      <div class="mt-4 space-y-2">
        <div
          v-for="item in ownerVenues"
          :key="item.id"
          class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
        >
          <div>
            <p class="font-black text-slate-950">{{ item.name }}</p>
            <p class="text-sm font-semibold text-slate-500">/{{ item.slug }}</p>
          </div>
          <AppButton variant="secondary" size="sm" @click="router.push(`/my-venues/${item.id}/settings`)">
            Edit venue
          </AppButton>
        </div>
        <p v-if="!ownerVenues.length" class="text-sm font-semibold text-slate-500">No venues yet.</p>
      </div>
    </AppCard>
  </AppShell>
</template>
