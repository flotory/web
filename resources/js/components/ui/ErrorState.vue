<script setup lang="ts">
import { AlertCircle } from '@lucide/vue'

import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'

withDefaults(
  defineProps<{
    title?: string
    message: string
    retryLabel?: string
    showRetry?: boolean
    bare?: boolean
  }>(),
  {
    title: 'Something went wrong',
    retryLabel: 'Try again',
    showRetry: true,
    bare: false,
  },
)

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <component :is="bare ? 'div' : AppCard" :wrapper-class="bare ? undefined : 'border-red-200/80 bg-red-50/50'">
    <div class="text-center">
      <div class="mx-auto grid size-14 place-items-center rounded-2xl bg-red-100 text-red-600 ring-1 ring-red-200/80">
        <AlertCircle class="size-7" :stroke-width="1.75" aria-hidden="true" />
      </div>
      <h2 class="mt-3 text-lg font-black tracking-tight text-slate-950">{{ title }}</h2>
      <p class="mx-auto mt-2 max-w-sm text-sm font-semibold text-red-700">{{ message }}</p>
      <AppButton
        v-if="showRetry"
        class="mt-4"
        variant="secondary"
        @click="emit('retry')"
      >
        {{ retryLabel }}
      </AppButton>
    </div>
  </component>
</template>
