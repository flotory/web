<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DesignPreviewFrame from '@/components/loyalty/DesignPreviewFrame.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import AppShell from '@/layouts/AppShell.vue'
import { api, ApiError, isVenueAccessDenied } from '@/lib/api'
import { VENUE_ACCESS_DENIED_MESSAGE } from '@/lib/venueWorkspace'
import {
  DESIGN_CANVAS,
  MOBILE_PREVIEW_FRAMES,
  WEB_PREVIEW_FRAMES,
} from '@/lib/designPreviewSpec'
import { rewardHasCustomImage, rewardUploadedImageUrl } from '@/lib/rewardMedia'
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
const rewardPreviewMilestones = computed(() =>
  milestones.value
    .filter((item) => item.active !== false)
    .sort((left, right) => left.required_stamps - right.required_stamps),
)

const milestonesWithUploadedImages = computed(() =>
  rewardPreviewMilestones.value.filter((item) => rewardHasCustomImage(item)),
)

const mobileCoverFrames = computed(() => MOBILE_PREVIEW_FRAMES.filter((frame) => (
  frame.id !== 'logo-ticket-fallback'
  && frame.id !== 'reward-ticket'
  && frame.id !== 'join-logo'
)))
const mobileLogoFrames = computed(() => MOBILE_PREVIEW_FRAMES.filter((frame) => (
  frame.id === 'logo-ticket-fallback' || frame.id === 'join-logo'
)))
const mobileRewardFrames = computed(() => MOBILE_PREVIEW_FRAMES.filter((frame) => frame.id === 'reward-ticket'))

const webCoverFrames = computed(() => WEB_PREVIEW_FRAMES.filter((frame) => frame.id === 'web-wallet-strip' || frame.id === 'web-landing-cover'))
const webLogoFrames = computed(() => WEB_PREVIEW_FRAMES.filter((frame) => frame.id.includes('logo')))
const webRewardFrames = computed(() => WEB_PREVIEW_FRAMES.filter((frame) => frame.id.includes('reward')))

async function loadMilestones(venueData: Venue): Promise<Reward[]> {
  try {
    const response = await api<{ rewards: Reward[] }>(`/venues/${venueId.value}/rewards`)
    return response.rewards
  } catch (exception) {
    if (!venueData.slug) {
      throw exception
    }

    const landing = await api<{
      milestones: Array<{
        id: number
        title: string
        description?: string | null
        image?: string | null
        image_thumb?: string | null
        required_stamps: number
      }>
    }>(`/public/venues/${encodeURIComponent(venueData.slug)}/landing`, { includeAuth: false })

    return landing.milestones.map((milestone) => ({
      id: milestone.id,
      venue_id: venueData.id,
      title: milestone.title,
      description: milestone.description ?? null,
      image: milestone.image ?? null,
      image_thumb: milestone.image_thumb ?? null,
      required_stamps: milestone.required_stamps,
      active: true,
    }))
  }
}

async function loadPage() {
  loading.value = true
  error.value = ''

  const venuePath = isAdmin.value
    ? `/admin/manage-venues/${venueId.value}`
    : `/venues/${venueId.value}`

  try {
    const venueResponse = await api<{ venue: Venue }>(venuePath)
    venue.value = venueResponse.venue
    milestones.value = [...(await loadMilestones(venueResponse.venue))].sort(
      (left, right) => left.required_stamps - right.required_stamps,
    )
  } catch (exception) {
    error.value = isVenueAccessDenied(exception)
      ? VENUE_ACCESS_DENIED_MESSAGE
      : exception instanceof ApiError
        ? exception.message
        : 'Could not load venue previews.'
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
      <div class="mt-4 flex flex-wrap gap-2">
        <AppButton v-if="!isAdmin && error === VENUE_ACCESS_DENIED_MESSAGE" @click="router.push('/my-venues')">
          Back to My Venues
        </AppButton>
        <AppButton v-else variant="secondary" @click="loadPage">Try again</AppButton>
      </div>
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
        <p class="mt-1 text-sm font-medium text-ink-muted">Used on wallet cards, discover, card detail, and landing page.</p>

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
        <p class="mt-1 text-sm font-medium text-ink-muted">Square 512×512 upload. Shown on join screen, web discover, landing, and as a fallback on reward tickets.</p>

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
          <template v-if="!rewardPreviewMilestones.length">
            Create a milestone on the rewards page to preview reward images.
          </template>
          <template v-else-if="!milestonesWithUploadedImages.length">
            None of your milestones have a custom image yet. Upload a 512×512 image on the rewards page — customers see a category placeholder until then.
          </template>
          <template v-else>
            Showing uploaded images only. Each milestone below uses the photo you saved on the rewards page.
          </template>
        </p>

        <div
          v-for="(milestone, index) in rewardPreviewMilestones"
          :key="milestone.id"
          :class="index > 0 ? 'mt-8 border-t border-border pt-6' : 'mt-5'"
        >
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="text-sm font-black text-ink">{{ milestone.title }}</h3>
            <span class="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
              {{ milestone.required_stamps }} stamps
            </span>
            <AppBadge v-if="!rewardHasCustomImage(milestone)" tone="slate">No image yet</AppBadge>
          </div>

          <div class="mt-4">
            <p class="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Mobile</p>
            <div class="flex flex-wrap gap-6">
              <DesignPreviewFrame
                v-for="frame in mobileRewardFrames"
                :key="`${milestone.id}-${frame.id}`"
                :label="frame.label"
                :platform="frame.platform"
                :width="frame.width"
                :height="frame.height"
                :border-radius="frame.borderRadius"
                :circular="frame.circular"
                :mirrors="frame.mirrors"
                :image-src="rewardUploadedImageUrl(milestone)"
                :max-display-width="frame.width"
              />
            </div>
          </div>

          <div class="mt-6">
            <p class="mb-3 text-xs font-bold uppercase tracking-wide text-ink-soft">Web</p>
            <div class="flex flex-wrap gap-6">
              <DesignPreviewFrame
                v-for="frame in webRewardFrames"
                :key="`${milestone.id}-${frame.id}`"
                :label="frame.label"
                :platform="frame.platform"
                :width="frame.width"
                :height="frame.height"
                :border-radius="frame.borderRadius"
                :mirrors="frame.mirrors"
                :image-src="rewardUploadedImageUrl(milestone)"
                :max-display-width="frame.width"
              />
            </div>
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
