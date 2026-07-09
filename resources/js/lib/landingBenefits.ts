import type { Component } from 'vue'
import {
  BarChart3,
  Gift,
  Handshake,
  MapPin,
  Megaphone,
  Nfc,
  Plug,
  Smartphone,
  Store,
} from '@lucide/vue'

export interface LandingBenefit {
  id: string
  title: string
  copy: string
  icon: Component
}

/** Owner-facing benefits for the landing page carousel (strongest value props first). */
export const landingOwnerBenefits: LandingBenefit[] = [
  {
    id: 'guest-cards',
    title: 'Guest stamp cards',
    copy: 'Digital loyalty in the Flotory app — join from QR or discover.',
    icon: Smartphone,
  },
  {
    id: 'nfc-counter',
    title: 'NFC at the counter',
    copy: 'One tap adds one stamp. No POS integration and no staff scanner.',
    icon: Nfc,
  },
  {
    id: 'owner-dashboard',
    title: 'Owner dashboard',
    copy: 'Visits, rewards, and branches in one place — with hands-on launch support from our team.',
    icon: Store,
  },
  {
    id: 'campaigns',
    title: 'Campaigns & milestones',
    copy: 'Run happy hour, VIP, and bring-back offers that multiply stamps or target guest segments.',
    icon: Megaphone,
  },
  {
    id: 'multi-location',
    title: 'Multi-location ready',
    copy: 'One loyalty program across branches — guests keep a single card at every site.',
    icon: MapPin,
  },
  {
    id: 'onboarding',
    title: 'Hands-on onboarding',
    copy: 'We configure rewards, NFC stands, and listing review — typical launch in 1–3 business days.',
    icon: Handshake,
  },
  {
    id: 'analytics',
    title: 'Visits & customer CRM',
    copy: 'Track repeat visits, reward unlocks, and guest history from one owner workspace.',
    icon: BarChart3,
  },
  {
    id: 'no-pos',
    title: 'No POS required',
    copy: 'Stamps via NFC and redemptions in the app — no till integration or scanner hardware.',
    icon: Plug,
  },
  {
    id: 'guest-app-free',
    title: 'Guest app included',
    copy: 'Your customers use the Flotory mobile app for free — stamps, progress, and slide-to-redeem.',
    icon: Gift,
  },
]

export function landingBenefitsSlidesPerView(width: number): number {
  if (width >= 1024) {
    return 3
  }

  if (width >= 768) {
    return 2
  }

  return 1
}

export function landingBenefitsMaxIndex(itemCount: number, slidesPerView: number): number {
  return Math.max(0, itemCount - slidesPerView)
}
