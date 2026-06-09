import { Ionicons } from '@expo/vector-icons'
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
}

export default function SecondaryButton({
  label,
  onPress,
  disabled,
  style,
  haptic = true,
  icon,
}: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={() => {
        if (haptic) hapticLightTap()
        onPress?.()
      }}
      disabled={disabled}
      style={style}
    >
      <View
        style={{
          backgroundColor: 'transparent',
          borderRadius: radius.button,
          borderWidth: 1.5,
          borderColor: colors.accentBorder,
          paddingVertical: 13,
          alignItems: 'center',
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={20} color={colors.ink} /> : null}
          <Text style={withAppFont({ color: colors.ink, fontWeight: '700', fontSize: 16 })}>{label}</Text>
        </View>
      </View>
    </Pressable>
  )
}
