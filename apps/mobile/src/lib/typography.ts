import type { TextStyle } from 'react-native'

/** Plus Jakarta Sans — modern, warm, friendly (loaded in app/_layout.tsx). */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const

export type FontWeightName = '400' | '500' | '600' | '700' | '800' | 'normal' | 'bold'

export function fontFamilyForWeight(weight?: TextStyle['fontWeight']): string {
  const value = weight == null ? '400' : String(weight)

  if (value === '800' || value === '900') return fonts.extraBold
  if (value === '700' || value === 'bold') return fonts.bold
  if (value === '600') return fonts.semiBold
  if (value === '500') return fonts.medium

  return fonts.regular
}

/** Merge typography with the correct font file for the requested weight. */
export function withAppFont(style: TextStyle): TextStyle {
  const family = style.fontFamily ?? fontFamilyForWeight(style.fontWeight)

  return {
    ...style,
    fontFamily: family,
  }
}

/** Shorthand for inline Text / TextInput styles. */
export const appTextStyle = withAppFont
