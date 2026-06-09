<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import HomeCampaignCarousel from '@/components/customer/HomeCampaignCarousel.vue'
import HomeQuickActions from '@/components/customer/HomeQuickActions.vue'
import HomeRewardCarousel from '@/components/customer/HomeRewardCarousel.vue'
import HomeRewardTicketCard from '@/components/customer/HomeRewardTicketCard.vue'
import HomeScreenHeader from '@/components/customer/HomeScreenHeader.vue'
import CustomerScreen from '@/components/customer/CustomerScreen.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import AppShell from '@/layouts/AppShell.vue'
import { useCustomerHome } from '@/composables/useCustomerHome'
const {
  firstName,
  loading,
  error,
  cards,
  homeCampaigns,
  campaignVenueById,
  primaryReady,
  featuredNextCard,
  rewardSlides,
  headerTitle,
  headerSubtitle,
  quickActions,
  activity,
  refresh,
  reload,
  silentRefreshWallet,
} = useCustomerHome()

const hasHeroReady = computed(() => Boolean(primaryReady.value))
const hasFeaturedNext = computed(() => Boolean(featuredNextCard.value))
const hasCarousel = computed(() => rewardSlides.value.length > 0)
</script>

<template>
  <AppShell>
    <CustomerScreen>
      <div class="mx-auto w-full max-w-md space-y-7 pb-4">
        <HomeScreenHeader
          :pretitle="`Hi, ${firstName}`"
          :title="headerTitle"
          :subtitle="headerSubtitle"
        />

        <div v-if="loading" class="pt-8">
          <EmptyState compact title="Loading home…" />
        </div>

        <ErrorState
          v-else-if="error"
          :message="error"
          @retry="reload"
        />

        <template v-else>
          <HomeRewardTicketCard
            v-if="hasHeroReady && primaryReady"
            variant="ready"
            :title="primaryReady.reward.title"
            :venue="primaryReady.customer.venue"
            :image-reward="primaryReady.reward"
            :unlock-id="primaryReady.unlock_id"
            @claim-unavailable="silentRefreshWallet"
          />

          <HomeRewardTicketCard
            v-else-if="hasFeaturedNext && featuredNextCard"
            variant="next"
            :title="featuredNextCard.summary?.next_reward_title ?? 'Your next reward'"
            :venue="featuredNextCard.venue"
            :image-reward="{
              title: featuredNextCard.summary?.next_reward_title ?? 'Reward',
              image: null,
              image_thumb: null,
            }"
            :stamps-to-go="featuredNextCard.summary?.stamps_to_next ?? null"
            :stamp-progress="{
              collected: featuredNextCard.summary?.stamps ?? featuredNextCard.stamps,
              target: featuredNextCard.summary?.next_reward_stamps ?? featuredNextCard.summary?.max_stamps ?? 10,
            }"
            :card-id="featuredNextCard.id"
            :venue-id="featuredNextCard.venue_id"
          />

          <div
            v-else-if="cards.length === 0"
            class="rounded-[22px] border border-border bg-surface p-6 text-center shadow-sm"
          >
            <p class="text-3xl">☕</p>
            <p class="mt-3 text-lg font-extrabold text-ink">Start your first card</p>
            <p class="mt-2 text-sm text-ink-muted">
              Discover a venue nearby and begin collecting visits toward your first reward.
            </p>
            <RouterLink to="/venues" class="mt-4 inline-block">
              <AppButton>Find a venue</AppButton>
            </RouterLink>
          </div>

          <div v-if="homeCampaigns.length > 0">
            <HomeCampaignCarousel
              :campaigns="homeCampaigns"
              :venue-by-id="campaignVenueById"
            />
          </div>

          <HomeQuickActions :actions="quickActions" />

          <div v-if="hasCarousel">
            <h2 class="mb-3 text-lg font-extrabold text-ink">
              {{ primaryReady ? 'More ready to claim' : 'Keep collecting' }}
            </h2>
            <HomeRewardCarousel
              :slides="rewardSlides"
              @claim-unavailable="silentRefreshWallet"
            />
          </div>

          <div v-if="activity.length > 0">
            <h2 class="text-lg font-extrabold text-ink">Recent activity</h2>
            <ul class="mt-3.5 space-y-3">
              <li
                v-for="row in activity"
                :key="row.id"
                class="flex items-start justify-between gap-3"
              >
                <span class="font-medium text-ink">{{ row.label }}</span>
                <span class="shrink-0 text-xs font-semibold text-ink-soft">{{ row.time }}</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            class="sr-only"
            @click="refresh"
          >
            Refresh
          </button>
        </template>
      </div>
    </CustomerScreen>
  </AppShell>
</template>
