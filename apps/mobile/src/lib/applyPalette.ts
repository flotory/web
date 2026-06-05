import type { FlotoryThemeColors } from '../theme'

export type PlatformPalette = Record<string, string>

type FlotoryColors = FlotoryThemeColors

const paletteToThemeKey: Record<string, keyof FlotoryColors> = {
  primary: 'primary',
  primary_soft: 'primarySoft',
  primary_text: 'primaryText',
  accent: 'accent',
  accent_soft: 'accentSoft',
  accent_border: 'accentBorder',
  accent_active: 'accentActive',
  bg: 'bg',
  surface: 'surface',
  surface_muted: 'surfaceMuted',
  border: 'border',
  ink: 'ink',
  ink_muted: 'inkMuted',
  ink_soft: 'inkSoft',
  success: 'success',
  success_text: 'successText',
  success_bg: 'successBg',
  success_border: 'successBorder',
  danger: 'danger',
  danger_soft: 'dangerSoft',
  campaign_bg: 'campaignBg',
  campaign_border: 'campaignBorder',
  reward_ready_accent: 'rewardReadyAccent',
  lavender: 'lavender',
  lavender_border: 'lavenderBorder',
  plum: 'plum',
  progress_track: 'progressTrack',
  progress_filled: 'progressFilled',
  bg_gradient_start: 'bgGradientStart',
  bg_gradient_end: 'bgGradientEnd',
}

export function mapPlatformPalette(palette: PlatformPalette): Partial<FlotoryColors> {
  const mapped: Partial<FlotoryColors> = {}

  for (const [apiKey, themeKey] of Object.entries(paletteToThemeKey)) {
    const value = palette[apiKey]
    if (typeof value === 'string' && value.length > 0) {
      mapped[themeKey] = value as FlotoryColors[typeof themeKey]
    }
  }

  return mapped
}
