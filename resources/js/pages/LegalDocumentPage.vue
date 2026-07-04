<script setup lang="ts">
import { computed } from 'vue'

import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { renderLegalMarkdown } from '@/lib/legalMarkdown'
import { marketingCardClass } from '@/lib/marketingPage'

const props = defineProps<{
  source: string
}>()

const html = computed(() => renderLegalMarkdown(props.source))
</script>

<template>
  <MarketingPageShell width="3xl" padding-y="10">
    <AppCard :wrapper-class="`${marketingCardClass} sm:p-8`">
      <article class="legal-document" v-html="html" />
    </AppCard>
  </MarketingPageShell>
</template>

<style scoped>
.legal-document :deep(h1) {
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--flotory-ink);
}

.legal-document :deep(h2) {
  margin-top: 2rem;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--flotory-ink);
}

.legal-document :deep(h3) {
  margin-top: 1.25rem;
  font-size: 1rem;
  font-weight: 700;
  color: var(--flotory-ink);
}

.legal-document :deep(p),
.legal-document :deep(li) {
  margin-top: 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--flotory-ink-muted);
}

.legal-document :deep(ul) {
  margin-top: 0.5rem;
  padding-left: 1.25rem;
  list-style: disc;
}

.legal-document :deep(a) {
  font-weight: 600;
  color: var(--flotory-accent-active);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.legal-document :deep(strong) {
  font-weight: 700;
  color: var(--flotory-ink-soft);
}
</style>
