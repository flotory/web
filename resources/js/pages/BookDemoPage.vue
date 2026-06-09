<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import FlotoryLogo from '@/components/brand/FlotoryLogo.vue'
import { MARKETING_HOME_PATH } from '@/lib/brand'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AsyncActionButton from '@/components/ui/AsyncActionButton.vue'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { api, ApiError } from '@/lib/api'
import {
  appendUtmToCalendlyUrl,
  loadCalendlyEmbedScript,
  type DemoBookingConfig,
  type DemoVenueType,
} from '@/lib/demoBooking'

const route = useRoute()
const submitAction = useAsyncAction()

const loading = ref(true)
const calendlyUrl = ref<string | null>(null)
const embedError = ref('')
const formError = ref('')
const formSuccess = ref('')

const name = ref('')
const email = ref('')
const venueName = ref('')
const city = ref('')
const venueType = ref<DemoVenueType | ''>('')
const message = ref('')
const companyWebsite = ref('')
const widgetHost = ref<HTMLElement | null>(null)

const demoBullets = [
  'How guests join from your table QR',
  'Staff scanning My QR for stamps',
  'Claim QR redemption at the counter',
]

const venueTypeOptions: Array<{ id: DemoVenueType; label: string }> = [
  { id: 'cafe', label: 'Cafe' },
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'bar', label: 'Bar' },
  { id: 'bakery', label: 'Bakery' },
  { id: 'other', label: 'Other' },
]

const calendlyEmbedUrl = computed(() => {
  if (!calendlyUrl.value) {
    return null
  }

  return appendUtmToCalendlyUrl(calendlyUrl.value, {
    utm_source: typeof route.query.utm_source === 'string' ? route.query.utm_source : 'flotory',
    utm_campaign: typeof route.query.utm_campaign === 'string' ? route.query.utm_campaign : 'book-demo',
    name: name.value.trim() || undefined,
    email: email.value.trim() || undefined,
  })
})

async function mountCalendlyWidget() {
  if (!calendlyEmbedUrl.value || !widgetHost.value) {
    return
  }

  try {
    await loadCalendlyEmbedScript()
    await nextTick()

    const calendly = (window as Window & {
      Calendly?: { initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void }
    }).Calendly

    if (!calendly) {
      throw new Error('Calendly unavailable')
    }

    widgetHost.value.replaceChildren()
    calendly.initInlineWidget({
      url: calendlyEmbedUrl.value,
      parentElement: widgetHost.value,
    })
  } catch {
    embedError.value = 'Could not load the booking calendar. Email us at team@flotory.com and we will set up a time.'
  }
}

async function loadBookingConfig() {
  loading.value = true
  embedError.value = ''

  try {
    const response = await api<DemoBookingConfig>('/public/demo-booking', { includeAuth: false })
    calendlyUrl.value = response.calendly_url
  } catch {
    embedError.value = 'Booking is temporarily unavailable. Share your details below and we will email you.'
  } finally {
    loading.value = false
  }
}

async function submitLead() {
  formError.value = ''
  formSuccess.value = ''

  try {
    await submitAction.run(async () => {
      try {
        const response = await api<{ message: string }>('/public/demo-leads', {
          method: 'POST',
          includeAuth: false,
          body: {
            name: name.value.trim(),
            email: email.value.trim(),
            venue_name: venueName.value.trim() || undefined,
            city: city.value.trim() || undefined,
            venue_type: venueType.value || undefined,
            message: message.value.trim() || undefined,
            source: 'book-demo',
            utm_source: typeof route.query.utm_source === 'string' ? route.query.utm_source : undefined,
            utm_campaign: typeof route.query.utm_campaign === 'string' ? route.query.utm_campaign : undefined,
            company_website: companyWebsite.value,
          },
        })

        formSuccess.value = response.message
      } catch (exception) {
        formError.value = exception instanceof ApiError
          ? exception.message
          : 'Could not save your details. Try again or email team@flotory.com.'
        throw exception
      }
    })
  } catch {
    // Button shows Failed.
  }
}

watch(calendlyEmbedUrl, () => {
  void mountCalendlyWidget()
})

onMounted(loadBookingConfig)
</script>

<template>
  <main class="min-h-screen bg-auth-gradient px-4 py-8 text-primary-text sm:py-12">
    <section class="mx-auto w-full max-w-3xl">
      <RouterLink :to="MARKETING_HOME_PATH" class="mb-6 inline-flex" aria-label="Flotory home">
        <FlotoryLogo inverted size="lg" />
      </RouterLink>

      <AppCard wrapper-class="rounded-3xl border border-border/20 bg-surface/95 p-6 shadow-[0_28px_80px_-24px_rgba(15,23,42,0.45)] sm:p-8">
        <AppBadge tone="blue">Owner demo</AppBadge>
        <h1 class="mt-4 text-4xl font-black tracking-tight text-ink">Book a 30-minute walkthrough</h1>
        <p class="mt-3 text-sm leading-relaxed text-ink-muted">
          No signup required. See how Flotory works for cafes, bars, and restaurants — then start free whenever you are ready.
        </p>

        <ul class="mt-5 space-y-2 text-sm font-semibold text-ink-muted">
          <li v-for="item in demoBullets" :key="item" class="flex items-start gap-2">
            <span class="mt-0.5 text-accent-active">✓</span>
            <span>{{ item }}</span>
          </li>
        </ul>

        <section class="mt-8 rounded-2xl border border-border/70 bg-surface-muted/60 p-5">
          <h2 class="text-lg font-black text-ink">Help us prepare (optional)</h2>
          <p class="mt-1 text-sm text-ink-muted">Share a few details so we can tailor the demo to your venue.</p>

          <form class="mt-4 space-y-4" @submit.prevent="submitLead">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block text-sm font-bold text-ink">
                Your name
                <input
                  v-model="name"
                  type="text"
                  required
                  autocomplete="name"
                  class="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-ink-soft"
                >
              </label>
              <label class="block text-sm font-bold text-ink">
                Email
                <input
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  class="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-ink-soft"
                >
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block text-sm font-bold text-ink">
                Venue name
                <input
                  v-model="venueName"
                  type="text"
                  autocomplete="organization"
                  class="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-ink-soft"
                >
              </label>
              <label class="block text-sm font-bold text-ink">
                City
                <input
                  v-model="city"
                  type="text"
                  autocomplete="address-level2"
                  class="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-ink-soft"
                >
              </label>
            </div>

            <label class="block text-sm font-bold text-ink">
              Venue type
              <select
                v-model="venueType"
                class="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-ink outline-none transition focus:border-ink-soft"
              >
                <option value="">Select one</option>
                <option v-for="option in venueTypeOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="block text-sm font-bold text-ink">
              Anything we should know?
              <textarea
                v-model="message"
                rows="3"
                class="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-ink-soft"
                placeholder="e.g. two locations, launching next month, replacing paper cards"
              />
            </label>

            <input
              v-model="companyWebsite"
              type="text"
              tabindex="-1"
              autocomplete="off"
              aria-hidden="true"
              class="hidden"
            >

            <p v-if="formError" class="text-sm font-semibold text-danger-text">{{ formError }}</p>
            <p v-if="formSuccess" class="text-sm font-semibold text-success-text">{{ formSuccess }}</p>

            <AsyncActionButton
              type="submit"
              class="w-full sm:w-auto"
              idle-label="Save details"
              loading-label="Saving..."
              error-label="Try again"
              :loading="submitAction.loading"
              :success="submitAction.success"
              :error="submitAction.error"
            />
          </form>
        </section>

        <section class="mt-8">
          <h2 class="text-lg font-black text-ink">Pick a time</h2>
          <p class="mt-1 text-sm text-ink-muted">Choose a slot that works for you. We will meet on Google Meet or Zoom.</p>

          <p v-if="loading" class="mt-4 text-sm font-semibold text-ink-muted">Loading calendar...</p>
          <p v-else-if="embedError" class="mt-4 text-sm font-semibold text-ink-muted">{{ embedError }}</p>

          <div
            v-else-if="calendlyEmbedUrl"
            ref="widgetHost"
            class="mt-4 min-h-[700px] w-full overflow-hidden rounded-2xl border border-border/70 bg-surface"
          />

          <p v-else class="mt-4 rounded-2xl border border-dashed border-border px-4 py-5 text-sm font-semibold text-ink-muted">
            Online booking is not configured yet. Submit the form above and we will email you to schedule.
          </p>
        </section>

        <div class="mt-8 flex flex-col gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-ink-muted">
            Prefer to explore on your own?
            <RouterLink to="/register?intent=owner" class="font-bold text-ink">Start free</RouterLink>
          </p>
          <RouterLink to="/register?intent=owner">
            <AppButton variant="secondary">Start free</AppButton>
          </RouterLink>
        </div>
      </AppCard>
    </section>
  </main>
</template>
