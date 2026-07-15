import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { Animated, Pressable, Text, View, type ViewStyle } from 'react-native'

import { hapticLightTap } from '../../lib/haptics'
import { withAppFont } from '../../lib/typography'
import { colors, motion, radius, shadows, type as typography } from '../../theme'

export type AppButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface AppButtonProps {
  label: string
  onPress?: () => void
  disabled?: boolean
  style?: ViewStyle
  pulse?: boolean
  haptic?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  variant?: AppButtonVariant
  testID?: string
}

export default function AppButton({
  label,
  onPress,
  disabled,
  style,
  pulse = false,
  haptic = true,
  icon,
  variant = 'primary',
  testID,
}: AppButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current
  const usePulse = pulse && variant === 'primary'

  useEffect(() => {
    if (!usePulse || disabled) {
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
  }, [disabled, pulseAnim, usePulse])

  const variantStyles = {
    primary: {
      backgroundColor: colors.primary,
      borderWidth: 0,
      borderColor: 'transparent',
      labelColor: colors.primaryText,
      iconColor: colors.primaryText,
      shadow: shadows.button,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.accentBorder,
      labelColor: colors.ink,
      iconColor: colors.ink,
      shadow: {},
    },
    danger: {
      backgroundColor: colors.danger,
      borderWidth: 0,
      borderColor: 'transparent',
      labelColor: colors.primaryText,
      iconColor: colors.primaryText,
      shadow: shadows.button,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'transparent',
      labelColor: colors.inkMuted,
      iconColor: colors.inkMuted,
      shadow: {},
    },
  }[variant]

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
      <Animated.View
        style={{
          backgroundColor: variantStyles.backgroundColor,
          borderRadius: radius.button,
          borderWidth: variantStyles.borderWidth,
          borderColor: variantStyles.borderColor,
          paddingVertical: 13,
          alignItems: 'center',
          opacity: disabled ? 0.65 : 1,
          transform: [{ scale: usePulse ? pulseAnim : 1 }],
          ...variantStyles.shadow,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={20} color={variantStyles.iconColor} /> : null}
          <Text style={withAppFont({ ...typography.buttonLabel, color: variantStyles.labelColor })}>{label}</Text>
        </View>
      </Animated.View>
    </Pressable>
  )
}
