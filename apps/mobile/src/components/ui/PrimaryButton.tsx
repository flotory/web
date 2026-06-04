import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View, type ViewStyle } from 'react-native'

import { hapticLightTap } from '../../lib/haptics'
import { withAppFont } from '../../lib/typography'
import { colors, motion, radius, shadows } from '../../theme'

interface PrimaryButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
  pulse?: boolean
  haptic?: boolean
  icon?: keyof typeof Ionicons.glyphMap
}

export default function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
  pulse = false,
  haptic = true,
  icon,
}: PrimaryButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!pulse || disabled) {
      pulseAnim.setValue(1)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: motion.ctaPulseMax, duration: motion.ctaPulseMs, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: motion.ctaPulseMs, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [disabled, pulse, pulseAnim])

  return (
    <Pressable
      onPress={() => {
        if (haptic) hapticLightTap()
        onPress?.()
      }}
      disabled={disabled}
      style={style}
    >
      <Animated.View
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.button,
          paddingVertical: 13,
          alignItems: 'center',
          opacity: disabled ? 0.65 : 1,
          transform: [{ scale: pulseAnim }],
          ...shadows.button,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={20} color={colors.primaryText} /> : null}
          <Text style={withAppFont({ color: colors.primaryText, fontWeight: '800', fontSize: 16 })}>{label}</Text>
        </View>
      </Animated.View>
    </Pressable>
  )
}
