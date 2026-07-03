<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { useRouter } from 'vue-router'

import { MARKETING_HOME_PATH } from '@/lib/brand'
import { resolveMarketingBack } from '@/lib/marketingNavigation'

const props = withDefaults(
  defineProps<{
    fallbackTo?: string
    label?: string
  }>(),
  {
    fallbackTo: MARKETING_HOME_PATH,
    label: 'Back',
  },
)

const router = useRouter()

function goBack() {
  const target = resolveMarketingBack(router.options.history.state, props.fallbackTo)

  if (target === 'back') {
    router.back()
    return
  }

  void router.push(target)
}
</script>

<template>
  <button
    type="button"
    class="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink-muted shadow-sm transition hover:border-ink-soft/40 hover:bg-surface-muted hover:text-ink active:scale-[0.98]"
    :aria-label="label"
    data-testid="marketing-back"
    @click="goBack"
  >
    <ArrowLeft class="size-5" :stroke-width="2.2" />
  </button>
</template>
