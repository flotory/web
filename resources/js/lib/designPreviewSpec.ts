/** Canonical upload canvases — match mobile defaults and web crop presets. */
export const DESIGN_CANVAS = {
  logo: { width: 512, height: 512, label: 'Venue logo', aspect: '1:1' },
  cover: { width: 1400, height: 700, label: 'Venue cover', aspect: '2:1' },
  reward: { width: 512, height: 512, label: 'Reward image', aspect: '1:1' },
} as const

export type DesignPreviewPlatform = 'mobile' | 'web'

export interface DesignPreviewFrameSpec {
  id: string
  label: string
  platform: DesignPreviewPlatform
  width: number
  height: number
  borderRadius: number
  circular?: boolean
  /** Mirrors a real component in the app */
  mirrors: string
  overlay?: 'wallet'
}

export const MOBILE_PREVIEW_FRAMES: DesignPreviewFrameSpec[] = [
  {
    id: 'wallet-card',
    label: 'Wallet card',
    platform: 'mobile',
    width: 358,
    height: 200,
    borderRadius: 24,
    mirrors: 'WalletHeroCard',
    overlay: 'wallet',
  },
  {
    id: 'discover-row',
    label: 'Discover list',
    platform: 'mobile',
    width: 96,
    height: 96,
    borderRadius: 16,
    mirrors: 'DiscoverVenueCard',
  },
  {
    id: 'card-detail-hero',
    label: 'Card detail',
    platform: 'mobile',
    width: 358,
    height: 200,
    borderRadius: 22,
    mirrors: 'CardDetailHeader',
  },
  {
    id: 'join-cover',
    label: 'Join venue',
    platform: 'mobile',
    width: 358,
    height: 168,
    borderRadius: 22,
    mirrors: 'VenueJoinScreen',
  },
  {
    id: 'campaign-chip',
    label: 'Home campaign',
    platform: 'mobile',
    width: 92,
    height: 92,
    borderRadius: 16,
    mirrors: 'HomeCampaignCard',
  },
  {
    id: 'reward-ticket',
    label: 'Reward ticket',
    platform: 'mobile',
    width: 88,
    height: 88,
    borderRadius: 44,
    circular: true,
    mirrors: 'HomeRewardTicketCard',
  },
  {
    id: 'logo-ticket-fallback',
    label: 'Logo (ticket fallback)',
    platform: 'mobile',
    width: 88,
    height: 88,
    borderRadius: 44,
    circular: true,
    mirrors: 'HomeRewardTicketCard',
  },
]

export const WEB_PREVIEW_FRAMES: DesignPreviewFrameSpec[] = [
  {
    id: 'web-wallet-strip',
    label: 'Wallet list',
    platform: 'web',
    width: 358,
    height: 112,
    borderRadius: 22,
    mirrors: 'CustomerWalletList',
  },
  {
    id: 'web-landing-cover',
    label: 'Landing cover',
    platform: 'web',
    width: 358,
    height: 96,
    borderRadius: 16,
    mirrors: 'VenueLandingPage',
  },
  {
    id: 'web-landing-logo',
    label: 'Landing logo',
    platform: 'web',
    width: 64,
    height: 64,
    borderRadius: 16,
    mirrors: 'VenueLandingPage',
  },
  {
    id: 'web-discover-logo',
    label: 'Discover logo',
    platform: 'web',
    width: 56,
    height: 56,
    borderRadius: 14,
    mirrors: 'CustomerVenuesPage',
  },
  {
    id: 'web-settings-logo',
    label: 'Settings preview',
    platform: 'web',
    width: 128,
    height: 128,
    borderRadius: 32,
    mirrors: 'VenueSettingsPage',
  },
  {
    id: 'web-reward-editor',
    label: 'Reward editor',
    platform: 'web',
    width: 180,
    height: 180,
    borderRadius: 16,
    mirrors: 'RewardsPage',
  },
  {
    id: 'web-reward-list',
    label: 'Rewards wallet',
    platform: 'web',
    width: 64,
    height: 64,
    borderRadius: 16,
    mirrors: 'CustomerRewardsPage',
  },
]
