<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DesignPreviewFrame from '@/components/loyalty/DesignPreviewFrame.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError } from '@/lib/api'
import {
  DESIGN_CANVAS,
  MOBILE_PREVIEW_FRAMES,
  WEB_PREVIEW_FRAMES,
} from '@/lib/designPreviewSpec'
import { rewardImageUrl } from '@/lib/rewardMedia'
import { venueCoverUrl, venueLogoUrl } from '@/lib/venueMedia'
import type { Reward, Venue } from '@/types'

const route = useRoute()
const router = useRouter()

const venue = ref<Venue | null>(null)
const milestones = ref<Reward[]>([])
const loading = ref(true)
const error = ref('')

const venueId = computed(() => Number(route.params.id))
const isAdmin = computed(() => route.name === 'admin-venue-design')
const settingsPath = computed(() => (
  isAdmin.value
    ? `/admin/manage-venues/${venueId.value}`
    : `/my-venues/${venueId.value}/settings`
))

const coverSrc = computed(() => venueCoverUrl(venue.value))
const logoSrc = computed(() => venueLogoUrl(venue.value))
const rewardSrc = computed(() => {
  const first = milestones.value.find((item) => item.active !== false) ?? milestones.value[0]
  return rewardImageUrl(first)
})

const mobileCoverFrames = computed(() => MOBILE_PREVIEW_FRAMES.filter((frame) => frame.id !== 'logo-ticket-fallback' && frame.id !== 'reward-ticket'))
const mobileLogoFrames = computed(() => MOBILE_PREVIEW_FRAMES.filter((frame) => frame.id === 'logo-ticket-fallback'))
const mobileRewardFrames = computed(() => MOBILE_PREVIEW_FRAMES.filter((frame) => frame.id === 'reward-ticket'))

const webCoverFrames = computed(() => WEB_PREVIEW_FRAMES.filter((frame) => frame.id === 'web-wallet-strip' || frame.id === 'web-landing-cover'))
const webLogoFrames = computed(() => WEB_PREVIEW_FRAMES.filter((frame) => frame.id.includes('logo')))
const webRewardFrames = computed(() => WEB_PREVIEW_FRAMES.filter((frame) => frame.id.includes('reward')))

async function loadPage() {
  loading.value = true
  error.value = ''

  const venuePath = isAdmin.value
    ? `/admin/manage-venues/${venueId.value}`
    : `/venues/${venueId.value}`

  try {
    const [venueResponse, rewardsResponse] = await Promise.all([
      api<{ venue: Venue }>(venuePath),
      api<{ rewards: Reward[] }>(`/venues/${venueId.value}/rewards`).catch(() => ({ rewards: [] as Reward[] })),
    ])

    venue.value = venueResponse.venue
    milestones.value = [...rewardsResponse.rewards].sort(
      (left, right) => left.required_stamps - right.required_stamps,
    )
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'Could not load venue previews.'
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <AppShell>
    <PageHeader
      title="Design previews"
      badge="Venue branding"
      :description="venue ? `See how ${venue.name} looks across mobile and web before customers do.` : 'Fixed-size previews for logos, covers, and rewards.'"
    >
      <template #actions>
        <AppButton variant="secondary" @click="router.push(settingsPath)">
          Back to settings
        </AppButton>
      </template>
    </PageHeader>

    <AppCard v-if="loading" wrapper-class="mb-5">
      <p class="text-sm font-bold text-ink-muted">Loading previews…</p>
    </AppCard>

    <AppCard v-else-if="error" wrapper-class="mb-5">
      <p class="text-sm font-bold text-danger">{{ error }}</p>
      <AppButton class="mt-4" @click="loadPage">Retry</AppButton>
    </AppCard>

    <div v-else-if="venue" class="space-y-5">
      <AppCard>
        <AppBadge tone="blue">Recommended upload sizes</AppBadge>
        <p class="mt-3 text-sm font-medium text-ink-muted">
          Design at these canvas sizes so crops match what customers see in the app.
        </p>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div
            v-for="canvas in DESIGN_CANVAS"
            :key="canvas.label"
            class="rounded-2xl border border-border bg-surface-muted px-4 py-3"
          >
            <p class="text-sm font-bold text-ink">{{ canvas.label }}</p>
            <p class="mt-1 text-lg font-black text-primary-soft">{{ canvas.width }}×{{ canvas.height }}</p>
            <p class="text-xs font-semibold text-ink-soft">{{ canvas.aspect }}</p>
          </div>
        </div>
        <p class="mt-4 text-xs font-medium text-ink-soft">
          Upload logo and reward images in venue settings or rewards. Cover uses a 2:1 safe zone — keep logos and text out of the top/bottom edges on wallet cards.
        </p>
      </AppCard>

      <AppCard>
        <h2 class="text-xl font-black text-ink">Venue cover</h2>
        <p class="mt-1 text-sm font-medium text-ink-muted">Used on wallet cards, discover, join screen, and landing page.</p>

        <div class="mt-5">
          <p class="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Mobile</p>
          <div class="flex flex-wrap gap-6">
            <DesignPreviewFrame
              v-for="frame in mobileCoverFrames"
              :key="frame.id"
              :label="frame.label"
              :platform="frame.platform"
              :width="frame.width"
              :height="frame.height"
              :border-radius="frame.borderRadius"
              :circular="frame.circular"
              :overlay="frame.overlay ?? null"
              :mirrors="frame.mirrors"
              :image-src="coverSrc"
              :max-display-width="frame.width <= 120 ? frame.width : 220"
            />
          </div>
        </div>

        <div class="mt-8 border-t border-border pt-6">
          <p class="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Web</p>
          <div class="flex flex-wrap gap-6">
            <DesignPreviewFrame
              v-for="frame in webCoverFrames"
              :key="frame.id"
              :label="frame.label"
              :platform="frame.platform"
              :width="frame.width"
              :height="frame.height"
              :border-radius="frame.borderRadius"
              :mirrors="frame.mirrors"
              :image-src="coverSrc"
              :max-display-width="220"
            />
          </div>
        </div>
      </AppCard>

      <AppCard>
        <h2 class="text-xl font-black text-ink">Venue logo</h2>
        <p class="mt-1 text-sm font-medium text-ink-muted">Square 512×512 upload. Shown on web discover, landing, and as a fallback on reward tickets.</p>

        <div class="mt-5">
          <p class="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Mobile</p>
          <div class="flex flex-wrap gap-6">
            <DesignPreviewFrame
              v-for="frame in mobileLogoFrames"
              :key="frame.id"
              :label="frame.label"
              :platform="frame.platform"
              :width="frame.width"
              :height="frame.height"
              :border-radius="frame.borderRadius"
              :circular="frame.circular"
              :mirrors="frame.mirrors"
              :image-src="logoSrc"
              :max-display-width="frame.width"
            />
          </div>
        </div>

        <div class="mt-8 border-t border-border pt-6">
          <p class="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Web</p>
          <div class="flex flex-wrap gap-6">
            <DesignPreviewFrame
              v-for="frame in webLogoFrames"
              :key="frame.id"
              :label="frame.label"
              :platform="frame.platform"
              :width="frame.width"
              :height="frame.height"
              :border-radius="frame.borderRadius"
              :mirrors="frame.mirrors"
              :image-src="logoSrc"
              :max-display-width="frame.width"
            />
          </div>
        </div>
      </AppCard>

      <AppCard>
        <h2 class="text-xl font-black text-ink">Reward image</h2>
        <p class="mt-1 text-sm font-medium text-ink-muted">
          Preview uses your first milestone{{ milestones[0] ? `: ${milestones[0].title}` : '' }}.
          Upload images on the rewards page.
        </p>

        <div class="mt-5">
          <p class="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Mobile</p>
          <div class="flex flex-wrap gap-6">
            <DesignPreviewFrame
              v-for="frame in mobileRewardFrames"
              :key="frame.id"
              :label="frame.label"
              :platform="frame.platform"
              :width="frame.width"
              :height="frame.height"
              :border-radius="frame.borderRadius"
              :circular="frame.circular"
              :mirrors="frame.mirrors"
              :image-src="rewardSrc"
              :max-display-width="frame.width"
            />
          </div>
        </div>

        <div class="mt-8 border-t border-border pt-6">
          <p class="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Web</p>
          <div class="flex flex-wrap gap-6">
            <DesignPreviewFrame
              v-for="frame in webRewardFrames"
              :key="frame.id"
              :label="frame.label"
              :platform="frame.platform"
              :width="frame.width"
              :height="frame.height"
              :border-radius="frame.borderRadius"
              :mirrors="frame.mirrors"
              :image-src="rewardSrc"
              :max-display-width="frame.width"
            />
          </div>
        </div>

        <AppButton
          v-if="!isAdmin"
          class="mt-6"
          variant="secondary"
          @click="router.push('/rewards')"
        >
          Edit reward images
        </AppButton>
      </AppCard>
    </div>
  </AppShell>
</template>
