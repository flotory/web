import { useEffect, useRef, type PropsWithChildren } from 'react'
import { Animated, type StyleProp, type ViewStyle } from 'react-native'

import { motion } from '../../theme'

interface AnimatedSectionProps extends PropsWithChildren {
  delayMs?: number
  style?: StyleProp<ViewStyle>
}

export default function AnimatedSection({ children, delayMs = 0, style }: AnimatedSectionProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(10)).current

  useEffect(() => {
    opacity.setValue(0)
    translateY.setValue(10)
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.fadeInMs, delay: delayMs, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: motion.fadeInMs, delay: delayMs, useNativeDriver: true }),
    ]).start()
  }, [delayMs, opacity, translateY])

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>
  )
}
