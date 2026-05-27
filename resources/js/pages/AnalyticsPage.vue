<script setup lang="ts">
import StatCard from '@/components/loyalty/StatCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppShell from '@/layouts/AppShell.vue'

const stats = [
  { label: 'Repeat rate', value: '37%', hint: '+4% vs last month' },
  { label: 'Avg stamps/customer', value: '4.8', hint: 'strong habit loop' },
  { label: 'Monthly visits', value: 742, hint: '+12%' },
]
</script>

<template>
  <AppShell>
    <div class="mb-6">
      <AppBadge tone="green">Analytics MVP</AppBadge>
      <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950">Simple retention insights</h1>
      <p class="mt-2 text-slate-500">Only the numbers a restaurant owner can act on quickly.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <AppCard wrapper-class="mt-6">
      <h2 class="text-xl font-black text-slate-950">Monthly activity</h2>
      <div class="mt-6 grid gap-3">
        <div v-for="month in ['Jan', 'Feb', 'Mar', 'Apr', 'May']" :key="month" class="flex items-center gap-4">
          <span class="w-10 text-sm font-bold text-slate-500">{{ month }}</span>
          <div class="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full bg-blue-600" :style="{ width: `${45 + month.length * 9}%` }" />
          </div>
        </div>
      </div>
    </AppCard>
  </AppShell>
</template>
