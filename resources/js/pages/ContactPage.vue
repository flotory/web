<script setup lang="ts">
import { MessageCircle, Send } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

import MarketingPageShell from '@/components/layout/MarketingPageShell.vue'
import AppAlert from '@/components/ui/AppAlert.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import FormLabel from '@/components/ui/FormLabel.vue'
import FormTextarea from '@/components/ui/FormTextarea.vue'
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
  <MarketingPageShell width="3xl" padding-y="10">
    <AppCard :wrapper-class="`${marketingCardClass} sm:p-8`">
      <div class="flex flex-wrap items-center gap-3">
        <AppBadge tone="amber">Contact</AppBadge>
        <h1 class="text-2xl font-black tracking-tight text-ink sm:text-3xl">Get in touch</h1>
      </div>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
        Questions about Flotory for your venue? Send us a message — we typically reply within one business day.
        Prefer a walkthrough?
        <RouterLink to="/book-demo" class="font-semibold text-ink hover:underline">Book A Demo</RouterLink>
      </p>

      <div class="mt-8 rounded-2xl border border-border/80 bg-surface-muted/50 p-4 sm:p-5">
        <p class="text-sm font-bold text-ink">Prefer chat?</p>
        <p class="mt-1 text-sm leading-relaxed text-ink-muted">
          Message us on WhatsApp or Telegram for a quick reply.
        </p>
        <div class="mt-4 flex flex-wrap gap-3">
          <a
            :href="legalConfig.supportWhatsAppUrl"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="contact-whatsapp"
          >
            <AppButton variant="secondary" size="sm" class="gap-2">
              <MessageCircle class="size-4" aria-hidden="true" />
              WhatsApp
            </AppButton>
          </a>
          <a
            :href="legalConfig.supportTelegramUrl"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="contact-telegram"
          >
            <AppButton variant="secondary" size="sm" class="gap-2">
              <Send class="size-4" aria-hidden="true" />
              Telegram
            </AppButton>
          </a>
        </div>
      </div>

      <div v-if="submitted" class="mt-8 rounded-2xl border border-accent-border/40 bg-accent-soft/60 p-5 text-sm text-ink-muted" data-testid="contact-success">
        <p class="font-bold text-ink">Message sent</p>
        <p class="mt-2">Thanks — we&apos;ll get back to you at {{ email }} soon.</p>
      </div>

      <form v-else class="mt-8 space-y-5" @submit.prevent="submit">
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <FormLabel for-id="contact-name">Name</FormLabel>
            <AppInput id="contact-name" v-model="name" required />
          </div>
          <div>
            <FormLabel for-id="contact-email">Email</FormLabel>
            <AppInput id="contact-email" v-model="email" required type="email" autocomplete="email" />
          </div>
        </div>
        <div>
          <FormLabel for-id="contact-venue">Venue or business (optional)</FormLabel>
          <AppInput id="contact-venue" v-model="venueName" placeholder="Harbor Coffee" />
        </div>
        <div>
          <FormLabel for-id="contact-message">Message</FormLabel>
          <FormTextarea
            id="contact-message"
            v-model="message"
            required
            :rows="6"
            placeholder="Tell us about your venue and what you&apos;re looking for."
          />
        </div>
        <AppAlert v-if="error">{{ error }}</AppAlert>
        <AppButton class="w-full sm:w-auto sm:min-w-[12rem]" size="lg" type="submit" :disabled="loading">
          {{ loading ? 'Sending…' : 'Send message' }}
        </AppButton>
      </form>

      <p class="mt-6 text-center text-sm text-ink-muted">
        Or email us directly at
        <a :href="`mailto:${legalConfig.supportEmail}`" class="font-bold text-ink">{{ legalConfig.supportEmail }}</a>
      </p>
    </AppCard>
  </MarketingPageShell>
</template>
