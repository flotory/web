<script setup lang="ts">
import { Nfc, Smartphone, Store } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import AppButton from '@/components/ui/AppButton.vue'
import { MOBILE_APP_PATH } from '@/lib/mobileApp'
import { rewardThumbUrl } from '@/lib/rewardMedia'
import {
  formatJoinSocialProof,
  formatVenueJoinRewardHeadline,
  formatStampsToUnlock,
  VENUE_JOIN_NFC_EDUCATION,
  VENUE_JOIN_STEPS,
  type VenueJoinHeroReward,
  type VenueJoinSocialProof,
} from '@/lib/venueJoinBridge'
import { venueLogoUrl } from '@/lib/venueMedia'
import type { VenueCategory } from '@/types'

const props = defineProps<{
  venue: {
    name: string
    category?: VenueCategory | null
    logo?: string | null
    logo_thumb?: string | null
  }
  heroReward?: VenueJoinHeroReward | null
  socialProof?: VenueJoinSocialProof | null
  appDeepLink: string
}>()

const stepIcons = [Smartphone, Store, Nfc]

const rewardHeadline = computed(() => formatVenueJoinRewardHeadline(props.heroReward))
const stampsLabel = computed(() => formatStampsToUnlock(props.heroReward?.required_stamps ?? 0))
const socialLabel = computed(() => formatJoinSocialProof(props.socialProof))
const stampSlots = computed(() => {
  const total = props.heroReward?.required_stamps ?? 0
  return total > 0 ? Math.min(total, 10) : 0
})
</script>

<template>
  <div class="join-bridge" data-testid="venue-join-bridge">
    <div class="venue-head">
      <img
        :src="venueLogoUrl(venue)"
        :alt="venue.name"
        class="venue-logo"
      >
      <h1 class="venue-name">{{ venue.name }}</h1>
      <p class="venue-tagline">Your digital stamp card</p>
    </div>

    <div class="reward-hero">
      <img
        :src="rewardThumbUrl(heroReward)"
        alt=""
        class="reward-image"
        tabindex="-1"
      >
      <div class="reward-copy">
        <p class="reward-kicker">First reward</p>
        <h2 class="reward-title">{{ rewardHeadline }}</h2>

        <div v-if="stampSlots" class="stamp-row" aria-hidden="true">
          <span
            v-for="slot in stampSlots"
            :key="slot"
            class="stamp-slot"
          />
        </div>

        <p class="reward-meta">{{ stampsLabel }}</p>
      </div>
    </div>

    <ol class="join-steps">
      <li
        v-for="(step, index) in VENUE_JOIN_STEPS"
        :key="step.label"
        class="join-step"
      >
        <span class="join-step-icon" aria-hidden="true">
          <component :is="stepIcons[index]" :size="18" :stroke-width="2.2" />
        </span>
        <span class="join-step-copy">
          <span class="join-step-label">{{ step.label }}</span>
          <span class="join-step-detail">{{ step.detail }}</span>
        </span>
      </li>
    </ol>

    <div class="nfc-education" data-testid="venue-join-nfc-education">
      <p class="nfc-education-kicker">{{ VENUE_JOIN_NFC_EDUCATION.title }}</p>
      <p class="nfc-education-headline">{{ VENUE_JOIN_NFC_EDUCATION.headline }}</p>
      <p class="nfc-education-detail">{{ VENUE_JOIN_NFC_EDUCATION.detail }}</p>
    </div>

    <p v-if="socialLabel" class="social-proof">{{ socialLabel }}</p>

    <a :href="appDeepLink" class="cta-link" data-testid="venue-join-cta">
      <AppButton class="w-full btn-glow" size="lg">Get my stamp card</AppButton>
    </a>

    <p class="cta-note">Free to join · works on any phone</p>

    <p class="footnote">
      Need the app?
      <RouterLink :to="MOBILE_APP_PATH" class="footnote-link">Get Flotory</RouterLink>
      from the App Store or Google Play.
    </p>

    <p class="member-note">
      Already a member? Tap the NFC stand at the counter — no need to scan this QR again.
    </p>
  </div>
</template>

<style scoped>
.join-bridge {
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.venue-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.venue-logo {
  width: 5rem;
  height: 5rem;
  border-radius: 1.35rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 80%, transparent);
  object-fit: cover;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--flotory-primary) 6%, transparent);
}

.venue-name {
  margin-top: 1rem;
  font-size: 1.65rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.1;
  color: var(--flotory-ink);
}

.venue-tagline {
  margin-top: 0.45rem;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--flotory-ink-muted);
}

.reward-hero {
  display: flex;
  gap: 0.95rem;
  border-radius: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--flotory-accent-border) 35%, var(--flotory-border));
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--flotory-accent-soft) 28%, var(--flotory-surface)) 0%,
    var(--flotory-surface) 100%
  );
  padding: 1rem;
}

.reward-image {
  width: 4.5rem;
  height: 4.5rem;
  flex-shrink: 0;
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--flotory-border) 75%, transparent);
  object-fit: cover;
}

.reward-copy {
  min-width: 0;
  flex: 1;
}

.reward-kicker {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--flotory-accent-active);
}

.reward-title {
  margin-top: 0.3rem;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.35;
  color: var(--flotory-ink);
}

.stamp-row {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.75rem;
}

.stamp-slot {
  flex: 1;
  height: 0.42rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--flotory-border) 55%, var(--flotory-surface-muted));
}

.reward-meta {
  margin-top: 0.55rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--flotory-ink-muted);
}

.join-steps {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.join-step {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
}

.join-step-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 0.7rem;
  background: var(--flotory-accent-soft);
  color: var(--flotory-accent-active);
}

.join-step-copy {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding-top: 0.1rem;
}

.join-step-label {
  font-size: 0.86rem;
  font-weight: 800;
  color: var(--flotory-ink);
}

.join-step-detail {
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--flotory-ink-muted);
}

.nfc-education {
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--flotory-accent-border) 45%, var(--flotory-border));
  background: color-mix(in srgb, var(--flotory-accent-soft) 55%, var(--flotory-surface));
  padding: 0.95rem 1rem;
}

.nfc-education-kicker {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--flotory-accent-active);
}

.nfc-education-headline {
  margin-top: 0.35rem;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.35;
  color: var(--flotory-ink);
}

.nfc-education-detail {
  margin-top: 0.3rem;
  font-size: 0.78rem;
  font-weight: 500;
  line-height: 1.45;
  color: var(--flotory-ink-muted);
}

.social-proof {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--flotory-ink-soft);
}

.cta-link {
  display: block;
}

.btn-glow {
  box-shadow: 0 8px 22px color-mix(in srgb, var(--flotory-accent) 35%, transparent);
}

.cta-note {
  margin-top: -0.35rem;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--flotory-ink-muted);
}

.footnote,
.member-note {
  text-align: center;
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.55;
  color: var(--flotory-ink-soft);
}

.footnote-link {
  font-weight: 800;
  color: var(--flotory-ink);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.member-note {
  padding-top: 0.35rem;
  border-top: 1px solid color-mix(in srgb, var(--flotory-border) 60%, transparent);
}
</style>
