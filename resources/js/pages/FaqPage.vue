<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { RouterLink } from 'vue-router'

import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { faqSections } from '@/lib/faqContent'
import { legalConfig } from '@/lib/legalConfig'
import { marketingCardClass } from '@/lib/marketingPage'
</script>

<template>
  <MarketingPageShell width="3xl" padding-y="10">
    <AppCard :wrapper-class="`${marketingCardClass} sm:p-8`">
      <div class="flex flex-wrap items-center gap-3">
        <AppBadge tone="amber">FAQ</AppBadge>
        <h1 class="text-2xl font-black tracking-tight text-ink sm:text-3xl">Frequently asked questions</h1>
      </div>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
        Quick answers about Flotory for venue owners and guests. Still unsure?
        <RouterLink to="/book-demo" class="font-semibold text-ink hover:underline">Book A Demo</RouterLink>
        or
        <RouterLink to="/contact" class="font-semibold text-ink hover:underline">Contact Us</RouterLink>.
      </p>

      <div class="mt-8 space-y-8">
        <section
          v-for="section in faqSections"
          :key="section.id"
          :aria-labelledby="`faq-section-${section.id}`"
        >
          <h2
            :id="`faq-section-${section.id}`"
            class="text-sm font-bold uppercase tracking-wide text-ink-muted"
          >
            {{ section.title }}
          </h2>

          <div class="mt-4 space-y-3">
            <details
              v-for="item in section.items"
              :key="item.id"
              class="group rounded-2xl border border-border/80 bg-surface-muted/60 open:bg-surface open:shadow-sm"
              :data-testid="`faq-item-${item.id}`"
            >
              <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left font-semibold text-ink marker:content-none sm:px-5">
                <span>{{ item.question }}</span>
                <ChevronDown
                  class="size-5 shrink-0 text-ink-muted transition group-open:rotate-180"
                  :stroke-width="2.2"
                />
              </summary>
              <div class="border-t border-border/70 px-4 pb-4 pt-3 text-sm leading-7 text-ink-muted sm:px-5">
                {{ item.answer }}
              </div>
            </details>
          </div>
        </section>
      </div>

      <div class="mt-10 rounded-2xl border border-accent-border/35 bg-accent-soft/50 p-5 sm:p-6">
        <h2 class="text-lg font-black text-ink">Didn&apos;t find your answer?</h2>
        <p class="mt-2 text-sm leading-relaxed text-ink-muted">
          Email
          <a :href="`mailto:${legalConfig.supportEmail}`" class="font-semibold text-ink">{{ legalConfig.supportEmail }}</a>
          or send us a message — we&apos;re happy to help.
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <RouterLink to="/contact">
            <AppButton variant="secondary">Contact Us</AppButton>
          </RouterLink>
          <RouterLink to="/book-demo">
            <AppButton>Book A Demo</AppButton>
          </RouterLink>
        </div>
      </div>
    </AppCard>
  </MarketingPageShell>
</template>

<style scoped>
details summary::-webkit-details-marker {
  display: none;
}
</style>
