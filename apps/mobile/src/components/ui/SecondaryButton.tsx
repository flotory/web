import { Ionicons } from '@expo/vector-icons'
import { type ReactNode } from 'react'
import { Pressable, Text, View, type ViewStyle } from 'react-native'

import { hapticLightTap } from '../../lib/haptics'
import { withAppFont } from '../../lib/typography'
import { colors, radius } from '../../theme'

interface SecondaryButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
  haptic?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  leading?: ReactNode
  /** `surface` = white fill for OAuth-style CTAs */
  variant?: 'outline' | 'surface'
  testID?: string
}

export default function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
  haptic = true,
  icon,
  leading,
  variant = 'outline',
  testID,
}: SecondaryButtonProps) {
  const isSurface = variant === 'surface'

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        if (haptic) hapticLightTap()
        onPress?.()
      }}
      disabled={disabled}
      style={style}
    >
      <View
        style={{
          backgroundColor: isSurface ? colors.surface : 'transparent',
          borderRadius: radius.button,
          borderWidth: 1.5,
          borderColor: isSurface ? colors.border : colors.accentBorder,
          paddingVertical: 13,
          alignItems: 'center',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {leading ?? (icon ? <Ionicons name={icon} size={20} color={colors.ink} /> : null)}
          <Text style={withAppFont({ color: colors.ink, fontWeight: '700', fontSize: 16 })}>{label}</Text>
        </View>
      </View>
    </Pressable>
  )
}
