import { fonts } from './lib/typography'

export const colors = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  ink: '#0F172A',
  inkMuted: '#64748B',
  inkSoft: '#98A2B3',
  border: '#E2E8F0',
  primary: '#0F172A',
  primarySoft: '#334155',
  primaryText: '#FFFFFF',
  danger: '#F04438',
  dangerSoft: '#FFE4E2',
  successText: '#166534',
  success: '#22C55E',
  successBg: '#ECFDF3',
  successBorder: '#BBF7D0',
  accent: '#D97706',
  accentSoft: '#FCF6E9',
  accentBorder: '#FDE68A',
  lavender: '#EEF2FF',
  lavenderBorder: '#E0E7FF',
  plum: '#1E293B',
  progressTrack: '#E2E8F0',
} as const

export const space = {
  screenX: 18,
  headerBottom: 16,
  sectionY: 28,
  sectionGap: 14,
  cardPad: 18,
  cardGap: 12,
  listGap: 14,
} as const

export const carousel = {
  rewardCardPeek: 40,
  rewardCardGap: 10,
  rewardImageSize: 84,
  cardPad: 14,
  /** How many campaign cards are visible across the viewport (2 full + half peek). */
  campaignVisibleCount: 2.5,
  campaignCardGap: 10,
} as const

/** Center tab scan button (My QR). */
export const tabBarQr = {
  size: 57,
  iconSize: 29,
  lift: 8,
} as const

export const gradients = {
  /** App-wide warm background — slate → lavender → soft peach → lavender → slate */
  screen: ['#F8FAFC', '#EEF2FF', '#F5EFE4', '#FCF6E9', '#EEF2FF', '#F8FAFC'] as const,
  screenLocations: [0, 0.2, 0.38, 0.55, 0.78, 1] as const,
  /** Carousel reward card — soft white → lavender → peach → white */
  carouselCard: ['#FFFFFF', '#F6F8FF', '#FDF8F0', '#FAF7FF', '#FFFFFF'] as const,
  carouselCardLocations: [0, 0.3, 0.55, 0.8, 1] as const,
} as const

export const radius = {
  card: 22,
  button: 999,
  image: 20,
  mediaTop: 20,
} as const

/** Shared cover image dimensions for list cards */
export const media = {
  coverHeight: 140,
} as const

/** Apple Wallet–style stacked cards on the wallet screen */
export const walletStack = {
  peek: 52,
  cardHeight: 308,
} as const

export const motion = {
  fadeInMs: 300,
  pressScale: 0.985,
  ctaPulseMax: 1.02,
  ctaPulseMs: 900,
  shadowPulseMin: 0.06,
  shadowPulseMax: 0.14,
  shadowPulseMs: 1400,
  giftBellIntervalMs: 3000,
  giftBellRotateDeg: 16,
} as const

/** Shared “reward ready” gift badge (ShakeGiftBadge) */
export const rewardReady = {
  iconName: 'gift' as const,
  iconSize: 22,
  badgeSize: 40,
  badgeRadius: 12,
  backgroundColor: colors.accentSoft,
  borderColor: colors.accentBorder,
  iconColor: colors.accent,
} as const

export const shadows = {
  sm: {
    shadowColor: colors.ink,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  md: {
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  button: {
    shadowColor: colors.ink,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  carousel: {
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
} as const

export const type = {
  hero: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    fontWeight: '800' as const,
    color: colors.ink,
    letterSpacing: -0.35,
    lineHeight: 40,
  },
  section: {
    fontFamily: fonts.semiBold,
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.inkMuted,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.45,
    color: colors.inkSoft,
    textTransform: 'uppercase' as const,
  },
}

/** Default for screens that set Text defaultProps in root layout. */
export const defaultFontFamily = fonts.regular
