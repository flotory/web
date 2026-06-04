import { fonts } from './lib/typography'

export { fonts }

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
  /** Discover venues — muted surfaces */
  discoverPillInactive: '#FFFFFF',
  discoverPillBorder: '#E8EDF3',
  discoverSearchFill: '#F1F5F9',
  discoverCardBorder: '#E8ECF4',
  discoverCategoryFill: '#EEF2FF',
  discoverCategoryIcon: '#475569',
  discoverRewardsFill: '#F0FDF4',
  discoverRewardsText: '#15803D',
  discoverRewardsBorder: '#DCFCE7',
} as const

/**
 * App screen wallpaper behind customer flows.
 * - stickers: cool white + loyalty icon doodles
 * - warm: beige + soft doodles (default)
 * - dots: minimal dot grid
 */
export const screenBackground = {
  variant: 'warm' as 'stickers' | 'warm' | 'dots',
  warm: {
    base: '#E5DDD0',
    wash: ['#FBF7F0', '#F4EBDC', '#E8DFD0', '#DDD2C2', '#D4C8B6'] as const,
    iconForest: 'rgba(22, 78, 58, 0.11)',
    iconClay: 'rgba(98, 62, 36, 0.095)',
    iconSand: 'rgba(148, 108, 58, 0.085)',
    iconAmber: 'rgba(180, 120, 42, 0.08)',
    iconMoss: 'rgba(52, 98, 72, 0.09)',
    blobLight: 'rgba(255, 252, 245, 0.5)',
    blobWarm: 'rgba(232, 196, 140, 0.18)',
    blobMoss: 'rgba(168, 198, 175, 0.22)',
    vignette: 'rgba(92, 72, 48, 0.06)',
  },
} as const

export function screenWallpaperBaseColor(): string {
  if (screenBackground.variant === 'warm') return screenBackground.warm.base
  if (screenBackground.variant === 'dots') return colors.bg
  return colors.bg
}

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

/** Customer bottom tab bar — keep in sync with `(customer)/_layout.tsx` */
export const tabBar = {
  height: 56,
  scrollBottomPad: 10,
  iconSize: 22,
  labelSize: 11,
} as const

/** Custom tab bar surface (CustomerTabBar SVG) */
export const tabBarSurface = {
  gradient: ['#FFFFFF', '#FBF8F2', '#F3EBDD', '#E8DFD0'] as const,
  gradientStops: [0, 0.35, 0.72, 1] as const,
  border: 'rgba(98, 72, 48, 0.14)',
  notchGlow: 'rgba(245, 208, 138, 0.22)',
  topHighlight: 'rgba(255, 255, 255, 0.55)',
  shadow: {
    color: '#5C4830',
    opacity: 0.12,
    radius: 16,
    offsetY: -6,
    elevation: 14,
  },
} as const

/** Center tab scan button (My QR). */
export const tabBarQr = {
  size: 50,
  iconSize: 24,
  lift: 3,
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

/** Full-bleed venue cards on the wallet screen */
export const walletCard = {
  height: 200,
  radius: 24,
  gap: 16,
} as const

/** @deprecated Stacked layout — kept for skeleton sizing */
export const walletStack = {
  peek: 52,
  cardHeight: walletCard.height,
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
