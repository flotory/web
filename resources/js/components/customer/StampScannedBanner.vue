<script setup lang="ts">
import { CheckCircle } from '@lucide/vue'
import { onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  title: string
  subtitle?: string
  autoHideMs?: number
}>(), {
  autoHideMs: 3000,
})

const emit = defineEmits<{
  dismiss: []
}>()

let timer: number | undefined

watch(
  () => props.visible,
  (visible) => {
    window.clearTimeout(timer)
    if (!visible) return
    timer = window.setTimeout(() => emit('dismiss'), props.autoHideMs)
  },
  { immediate: true },
)

onUnmounted(() => {
  window.clearTimeout(timer)
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="-translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-1 opacity-0"
  >
    <div
      v-if="visible"
      class="pointer-events-none fixed inset-x-3.5 top-3 z-50"
    >
      <div class="flex items-center gap-3 rounded-2xl border-[1.5px] border-success-border bg-surface/98 px-3.5 py-3 shadow-lg">
        <div class="grid size-[34px] shrink-0 place-items-center rounded-full bg-success-bg">
          <CheckCircle class="size-[22px] text-success-text" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-base font-bold text-ink">{{ title }}</p>
          <p
            v-if="subtitle"
            class="mt-0.5 truncate text-sm text-ink-muted"
          >
            {{ subtitle }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>
