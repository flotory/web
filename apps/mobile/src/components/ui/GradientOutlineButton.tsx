import { Text, View, type ViewStyle } from 'react-native'

import { colors, radius, shadows } from '../../theme'

interface GradientOutlineButtonProps {
  label: string
  style?: ViewStyle
}

export default function GradientOutlineButton({ label, style }: GradientOutlineButtonProps) {
  return (
    <View
      style={{
        marginTop: 12,
        backgroundColor: colors.surface,
        borderRadius: radius.image,
        paddingVertical: 12,
        alignItems: 'center',
        ...shadows.carousel,
        ...style,
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>{label}</Text>
    </View>
  )
}
