<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'

import { useAuthStore } from '@/stores/auth'
import { useRealtimeStore } from '@/stores/realtime'

const auth = useAuthStore()
const realtime = useRealtimeStore()
const router = useRouter()

watch(
  () => [auth.token, auth.user?.id, auth.user?.is_admin],
  () => {
    if (auth.token && auth.user && !auth.user.is_admin) {
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
  <Toaster position="top-center" rich-colors close-button />
</template>
