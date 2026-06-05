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

/** Option 3 premium palette — navy, gold, cream, white */
const defaultColors: FlotoryThemeColors = {
  bg: '#F7F2E8',
  surface: '#FFFFFF',
  surfaceMuted: '#E9ECF1',
  ink: '#081233',
  inkMuted: '#5C6478',
  inkSoft: '#8B93A7',
  border: '#E9ECF1',
  primary: '#081233',
  primarySoft: '#0C1A45',
  primaryText: '#FFFFFF',
  danger: '#C14E41',
  dangerSoft: '#FBE7E3',
  successText: '#2E7D4F',
  success: '#2E7D4F',
  successBg: '#DFF2E4',
  successBorder: '#C8E6D0',
  accent: '#D6B15E',
  accentSoft: '#E8D8A8',
  accentBorder: '#D6B15E',
  accentActive: '#B78D2F',
  lavender: '#E8D8A8',
  lavenderBorder: '#D6B15E',
  plum: '#081233',
  progressTrack: '#E9ECF1',
  progressFilled: '#D6B15E',
  campaignBg: '#081233',
  campaignBorder: '#D6B15E',
  rewardReadyAccent: '#D6B15E',
  bgGradientStart: '#FAF7F0',
  bgGradientEnd: '#F7F2E8',
  /** Discover venues — muted surfaces */
  discoverPillInactive: '#FFFFFF',
  discoverPillBorder: '#E9ECF1',
  discoverSearchFill: '#E9ECF1',
  discoverCardBorder: '#E9ECF1',
  discoverCategoryFill: '#E8D8A8',
  discoverCategoryIcon: '#081233',
  discoverRewardsFill: '#DFF2E4',
  discoverRewardsText: '#2E7D4F',
  discoverRewardsBorder: '#C8E6D0',
}

/** Mutable theme colors — updated by ThemeProvider when platform palette loads. */
export let colors: FlotoryThemeColors = { ...defaultColors }

export function applyThemeColors(partial: Partial<FlotoryThemeColors>): FlotoryThemeColors {
  colors = { ...colors, ...partial }
  return colors
}

/**
 * App screen wallpaper behind customer flows.
 */
export const screenBackground = {
  variant: 'warm' as 'stickers' | 'warm' | 'dots',
  warm: {
    base: '#F7F2E8',
    wash: ['#FAF7F0', '#F7F2E8'] as const,
    iconForest: 'rgba(8, 18, 51, 0.05)',
    iconClay: 'rgba(183, 141, 47, 0.06)',
    iconSand: 'rgba(214, 177, 94, 0.05)',
    iconAmber: 'rgba(214, 177, 94, 0.07)',
    iconMoss: 'rgba(8, 18, 51, 0.04)',
    blobLight: 'rgba(255, 255, 255, 0.35)',
    blobWarm: 'rgba(214, 177, 94, 0.08)',
    blobMoss: 'rgba(8, 18, 51, 0.03)',
    vignette: 'rgba(8, 18, 51, 0.03)',
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
  gradient: ['#FFFFFF', '#FAF7F0', '#F7F2E8', '#F0EBE0'] as const,
  gradientStops: [0, 0.35, 0.72, 1] as const,
  border: 'rgba(8, 18, 51, 0.08)',
  notchGlow: 'rgba(214, 177, 94, 0.18)',
  topHighlight: 'rgba(255, 255, 255, 0.65)',
  shadow: {
    color: '#081233',
    opacity: 0.08,
    radius: 16,
    offsetY: -6,
    elevation: 14,
  },
} as const

export const tabBarQr = {
  size: 50,
  iconSize: 24,
  lift: 3,
} as const

export const gradients = {
  screen: ['#FAF7F0', '#F7F2E8', '#F7F2E8'] as const,
  screenLocations: [0, 0.55, 1] as const,
  carouselCard: ['#FFFFFF', '#FAF7F0', '#FFFFFF'] as const,
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
  shadowPulseMin: 0.06,
  shadowPulseMax: 0.14,
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

export const defaultFontFamily = fonts.regular
