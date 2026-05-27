<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'

const auth = useAuthStore()
const realtime = useRealtimeStore()
const router = useRouter()

watch(
  () => [auth.token, auth.user?.id, auth.user?.role],
  () => {
    if (auth.user?.role === 'customer' && auth.token) {
      realtime.startCustomerListeners(router).catch(() => undefined)
      return
    }

    realtime.stop()
  },
  { immediate: true },
)
</script>

<template>
  <RouterView />
</template>
