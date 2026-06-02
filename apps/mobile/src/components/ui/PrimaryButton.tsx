import { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, type ViewStyle } from 'react-native'

import { hapticLightTap } from '../../lib/haptics'
import { colors, motion, radius, shadows } from '../../theme'

interface PrimaryButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
  pulse?: boolean
  haptic?: boolean
}

export default function PrimaryButton({ label, onPress, disabled, style, pulse = false, haptic = true }: PrimaryButtonProps) {
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
        <Text style={{ color: colors.primaryText, fontWeight: '800', fontSize: 16 }}>{label}</Text>
      </Animated.View>
    </Pressable>
  )
}
