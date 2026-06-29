<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { MARKETING_HOME_PATH } from '@/lib/brand'
import { authFieldClass } from '@/lib/authForm'
import { api, ApiError } from '@/lib/api'
import { legalConfig } from '@/lib/legalConfig'
import { marketingCardClass } from '@/lib/marketingPage'

const name = ref('')
const email = ref('')
const venueName = ref('')
const message = ref('')
const loading = ref(false)
const error = ref('')
const submitted = ref(false)

async function submit() {
  loading.value = true
  error.value = ''

  try {
    await api('/contact', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        venue_name: venueName.value || undefined,
        message: message.value,
      },
    })
    submitted.value = true
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not send your message. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <MarketingPageShell width="lg">
    <RouterLink :to="MARKETING_HOME_PATH" class="mb-4 inline-flex" aria-label="Flotory home">
      <FlotoryLogo size="lg" />
    </RouterLink>

    <AppCard :wrapper-class="`${marketingCardClass} sm:p-6`">
      <div class="flex flex-wrap items-center gap-3">
        <AppBadge tone="amber">Contact</AppBadge>
        <h1 class="text-2xl font-black tracking-tight text-ink sm:text-3xl">Get in touch</h1>
      </div>
      <p class="mt-2 text-sm leading-relaxed text-ink-muted">
        Questions about Flotory for your venue? Send us a message — we typically reply within one business day.
        Prefer a walkthrough?
        <RouterLink to="/book-demo" class="font-semibold text-ink hover:underline">Book a demo</RouterLink>
      </p>

      <div v-if="submitted" class="mt-6 rounded-2xl border border-accent-border/40 bg-accent-soft/60 p-5 text-sm text-ink-muted" data-testid="contact-success">
        <p class="font-bold text-ink">Message sent</p>
        <p class="mt-2">Thanks — we&apos;ll get back to you at {{ email }} soon.</p>
      </div>

      <form v-else class="mt-6 space-y-4" @submit.prevent="submit">
        <div>
          <label class="text-sm font-bold text-ink-muted" for="contact-name">Name</label>
          <input id="contact-name" v-model="name" required :class="authFieldClass">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="contact-email">Email</label>
          <input id="contact-email" v-model="email" required type="email" autocomplete="email" :class="authFieldClass">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="contact-venue">Venue or business (optional)</label>
          <input id="contact-venue" v-model="venueName" :class="authFieldClass" placeholder="Harbor Coffee">
        </div>
        <div>
          <label class="text-sm font-bold text-ink-muted" for="contact-message">Message</label>
          <textarea
            id="contact-message"
            v-model="message"
            required
            rows="5"
            class="mt-2 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:border-ink-soft"
            placeholder="Tell us about your venue and what you&apos;re looking for."
          />
        </div>
        <p v-if="error" class="rounded-2xl bg-danger-soft p-3 text-sm font-semibold text-danger">{{ error }}</p>
        <AppButton class="w-full" size="lg" type="submit" :disabled="loading">
          {{ loading ? 'Sending…' : 'Send message' }}
        </AppButton>
      </form>

      <p class="mt-5 text-center text-sm text-ink-muted">
        Or email us directly at
        <a :href="`mailto:${legalConfig.supportEmail}`" class="font-bold text-ink">{{ legalConfig.supportEmail }}</a>
      </p>
    </AppCard>
  </MarketingPageShell>
</template>
