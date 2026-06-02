import { useEffect, useRef, type PropsWithChildren } from 'react'
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, motion } from '../../theme'

interface ShadowPulseProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>
  disabled?: boolean
}

/** Subtle shadow opacity pulse — no scale/transform. */
export default function ShadowPulse({ children, style, disabled = false }: ShadowPulseProps) {
  const shadowOpacity = useRef(new Animated.Value(motion.shadowPulseMin)).current

  useEffect(() => {
    if (disabled) {
      shadowOpacity.setValue(motion.shadowPulseMin)
      return
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shadowOpacity, {
          toValue: motion.shadowPulseMax,
          duration: motion.shadowPulseMs,
          useNativeDriver: false,
        }),
        Animated.timing(shadowOpacity, {
          toValue: motion.shadowPulseMin,
          duration: motion.shadowPulseMs,
          useNativeDriver: false,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [disabled, shadowOpacity])

  if (disabled) {
    return <View style={style}>{children}</View>
  }

  return (
    <Animated.View
      style={[
        style,
        {
          shadowColor: colors.ink,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity,
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}
