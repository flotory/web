import { fonts } from './lib/typography'

export { fonts }

export type FlotoryThemeColors = {
  bg: string
  surface: string
  surfaceMuted: string
  ink: string
  inkMuted: string
  inkSoft: string
  border: string
  primary: string
  primarySoft: string
  primaryText: string
  danger: string
  dangerSoft: string
  successText: string
  success: string
  successBg: string
  successBorder: string
  accent: string
  accentSoft: string
  accentBorder: string
  accentActive: string
  lavender: string
  lavenderBorder: string
  plum: string
  progressTrack: string
  progressFilled: string
  campaignBg: string
  campaignBorder: string
  rewardReadyAccent: string
  bgGradientStart: string
  bgGradientEnd: string
  discoverPillInactive: string
  discoverPillBorder: string
  discoverSearchFill: string
  discoverCardBorder: string
  discoverCategoryFill: string
  discoverCategoryIcon: string
  discoverRewardsFill: string
  discoverRewardsText: string
  discoverRewardsBorder: string
}

/** Premium hospitality palette — navy, gold, ivory, cream */
const defaultColors: FlotoryThemeColors = {
  bg: '#FCFAF6',
  surface: '#FFFFFF',
  surfaceMuted: '#F5EFE4',
  ink: '#050D1E',
  inkMuted: '#6D7687',
  inkSoft: '#A7AFBD',
  border: '#E8E2D8',
  primary: '#050D1E',
  primarySoft: '#0A1628',
  primaryText: '#FFFFFF',
  danger: '#9E4A44',
  dangerSoft: '#F3C7C3',
  successText: '#2E6D4C',
  success: '#2E6D4C',
  successBg: '#BFE4CC',
  successBorder: '#A8D4BC',
  accent: '#D7A35D',
  accentSoft: '#F3E0B9',
  accentBorder: '#D7A35D',
  accentActive: '#B8873E',
  lavender: '#F3E0B9',
  lavenderBorder: '#D7A35D',
  plum: '#050D1E',
  progressTrack: '#E8E2D8',
  progressFilled: '#D7A35D',
  campaignBg: '#050D1E',
  campaignBorder: '#D7A35D',
  rewardReadyAccent: '#D7A35D',
  bgGradientStart: '#FCFAF6',
  bgGradientEnd: '#FCFAF6',
  discoverPillInactive: '#FFFFFF',
  discoverPillBorder: '#E8E2D8',
  discoverSearchFill: '#F5EFE4',
  discoverCardBorder: '#E8E2D8',
  discoverCategoryFill: '#F3E0B9',
  discoverCategoryIcon: '#050D1E',
  discoverRewardsFill: '#BFE4CC',
  discoverRewardsText: '#2E6D4C',
  discoverRewardsBorder: '#A8D4BC',
}

/** Mutable theme colors — updated by ThemeProvider when platform palette loads. */
export let colors: FlotoryThemeColors = { ...defaultColors }

export function applyThemeColors(partial: Partial<FlotoryThemeColors>): FlotoryThemeColors {
  colors = { ...colors, ...partial }
  return colors
}

/**
 * App screen wallpaper behind customer flows — flat ivory with optional subtle marks.
 */
export const screenBackground = {
  variant: 'warm' as 'stickers' | 'warm' | 'dots',
  warm: {
    base: '#FCFAF6',
    wash: ['#FCFAF6', '#FCFAF6'] as const,
    iconForest: 'rgba(5, 13, 30, 0.04)',
    iconClay: 'rgba(215, 163, 93, 0.05)',
    iconSand: 'rgba(215, 163, 93, 0.04)',
    iconAmber: 'rgba(215, 163, 93, 0.05)',
    iconMoss: 'rgba(5, 13, 30, 0.03)',
    blobLight: 'transparent',
    blobWarm: 'transparent',
    blobMoss: 'transparent',
    vignette: 'transparent',
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
  campaignVisibleCount: 2.5,
  campaignCardGap: 10,
} as const

export const tabBar = {
  height: 56,
  scrollBottomPad: 10,
  iconSize: 22,
  labelSize: 11,
} as const

export const tabBarSurface = {
  fill: '#FFFFFF',
  border: 'rgba(5, 13, 30, 0.06)',
  shadow: {
    color: '#050D1E',
    opacity: 0.06,
    radius: 12,
    offsetY: -4,
    elevation: 8,
  },
} as const

export const tabBarQr = {
  size: 50,
  iconSize: 24,
  lift: 3,
} as const

export const gradients = {
  screen: ['#FCFAF6', '#FCFAF6', '#FCFAF6'] as const,
  screenLocations: [0, 0.55, 1] as const,
  carouselCard: ['#FFFFFF', '#FFFFFF', '#FFFFFF'] as const,
  carouselCardLocations: [0, 0.5, 1] as const,
} as const

export const radius = {
  card: 22,
  button: 999,
  image: 20,
  mediaTop: 20,
} as const

export const media = {
  coverHeight: 140,
} as const

export const walletCard = {
  height: 200,
  radius: 24,
  gap: 16,
} as const

export const walletStack = {
  peek: 52,
  cardHeight: walletCard.height,
} as const

export const motion = {
  fadeInMs: 300,
  pressScale: 0.985,
  ctaPulseMax: 1.02,
  ctaPulseMs: 900,
  stampBannerShowMs: 3000,
  stampCardRevealMs: 480,
  stampBannerBeforeSlotsMs: 260,
  stampSlotHighlightMs: 5000,
  stampGiftUnlockMs: 1500,
  shadowPulseMin: 0.05,
  shadowPulseMax: 0.08,
  shadowPulseMs: 1400,
  giftBellIntervalMs: 3000,
  giftBellRotateDeg: 16,
} as const

export const rewardReady = {
  iconName: 'gift' as const,
  iconSize: 22,
  badgeSize: 40,
  badgeRadius: 12,
  backgroundColor: colors.accentSoft,
  borderColor: colors.accentBorder,
  iconColor: colors.accentActive,
} as const

export const shadows = {
  sm: {
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  md: {
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  carousel: {
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
    fontFamily: fonts.bold,
    fontSize: 22,
    fontWeight: '700' as const,
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

export const defaultFontFamily = fonts.regular
