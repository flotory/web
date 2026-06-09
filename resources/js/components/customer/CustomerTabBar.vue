<script setup lang="ts">
import { Home, MapPin, QrCode, User, Wallet } from '@lucide/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { buildTabBarSurfacePath } from '@/lib/tabBarShape'

const route = useRoute()
const barRef = ref<HTMLElement | null>(null)
const barWidth = ref(390)

interface CustomerTab {
  name: string
  label: string
  to: string
  icon: typeof Home
  center?: boolean
}

const tabs: CustomerTab[] = [
  { name: 'customer-home', label: 'Home', to: '/home', icon: Home },
  { name: 'customer-wallet', label: 'Wallet', to: '/wallet', icon: Wallet },
  { name: 'customer-my-qr', label: 'My QR', to: '/my-qr', icon: QrCode, center: true },
  { name: 'customer-venues', label: 'Venues', to: '/venues', icon: MapPin },
  { name: 'customer-settings', label: 'Profile', to: '/customer/settings', icon: User },
]

const surfacePath = computed(() => buildTabBarSurfacePath(barWidth.value, 56))

function isActive(tab: (typeof tabs)[number]) {
  if (tab.name === 'customer-wallet') {
    return route.name === 'customer-wallet' || route.name === 'customer-card'
  }

  return route.name === tab.name
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  if (!barRef.value) return

  const update = () => {
    barWidth.value = Math.round(barRef.value?.getBoundingClientRect().width ?? 390)
  }

  update()
  resizeObserver = new ResizeObserver(update)
  resizeObserver.observe(barRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <nav
    ref="barRef"
    class="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md"
    aria-label="Customer navigation"
  >
    <div class="relative h-14 pb-[env(safe-area-inset-bottom)]">
      <svg
        class="absolute inset-x-0 top-0 h-14 w-full drop-shadow-[0_-4px_24px_rgba(5,13,30,0.08)]"
        :viewBox="`0 0 ${barWidth} 56`"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          :d="surfacePath"
          class="fill-surface stroke-border"
          stroke-width="1"
        />
      </svg>

      <div class="relative flex h-14 items-end px-1 pt-1">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          :class="[
            'flex flex-col items-center justify-end pb-1 transition',
            tab.center ? 'flex-[1.15] -top-1 relative' : 'flex-1',
            isActive(tab) ? 'text-ink' : 'text-ink-soft',
          ]"
        >
          <div
            v-if="tab.center"
            class="mb-1 grid place-items-center"
          >
            <div class="rounded-[22px] bg-accent p-[3px] shadow-sm">
              <div
                :class="[
                  'grid size-12 place-items-center rounded-[18px] transition',
                  isActive(tab) ? 'bg-primary-soft' : 'bg-primary text-primary-text',
                ]"
              >
                <div class="relative grid size-10 place-items-center">
                  <span class="pointer-events-none absolute inset-2 rounded-sm border-2 border-accent" style="border-right: 0; border-bottom: 0;" />
                  <span class="pointer-events-none absolute inset-2 rounded-sm border-2 border-accent" style="border-left: 0; border-bottom: 0; left: auto;" />
                  <span class="pointer-events-none absolute inset-2 rounded-sm border-2 border-accent" style="border-right: 0; border-top: 0; top: auto;" />
                  <span class="pointer-events-none absolute inset-2 rounded-sm border-2 border-accent" style="border-left: 0; border-top: 0; left: auto; top: auto;" />
                  <QrCode class="size-5 text-primary-text" :class="isActive(tab) ? 'text-ink' : ''" />
                </div>
              </div>
            </div>
          </div>
          <template v-else>
            <component :is="tab.icon" class="size-5" aria-hidden="true" />
            <span class="mt-0.5 text-[11px] font-semibold">{{ tab.label }}</span>
          </template>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
