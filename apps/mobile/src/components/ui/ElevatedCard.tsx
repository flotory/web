import { View, type ViewStyle } from 'react-native'
import type { PropsWithChildren } from 'react'

import { colors, radius, shadows } from '../../theme'

interface ElevatedCardProps extends PropsWithChildren {
  style?: ViewStyle
  intensity?: 'sm' | 'md'
}

export default function ElevatedCard({ children, style, intensity = 'sm' }: ElevatedCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        ...(intensity === 'md' ? shadows.md : shadows.sm),
        ...style,
      }}
    >
      {children}
    </View>
  )
}
