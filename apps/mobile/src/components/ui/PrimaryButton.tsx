import { Pressable, Text, type ViewStyle } from 'react-native'

import { colors, radius, shadows } from '../../theme'

interface PrimaryButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
}

export default function PrimaryButton({ label, onPress, disabled, style }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        backgroundColor: colors.primary,
        borderRadius: radius.button,
        paddingVertical: 13,
        alignItems: 'center',
        opacity: disabled ? 0.65 : 1,
        ...shadows.button,
        ...style,
      }}
    >
      <Text style={{ color: colors.primaryText, fontWeight: '800', fontSize: 16 }}>{label}</Text>
    </Pressable>
  )
}
