import { useRef } from 'react'
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'

import { motion } from '../../theme'

interface PressableCardProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
}

export default function PressableCard({ style, children, onPressIn, onPressOut, ...props }: PressableCardProps) {
  const scale = useRef(new Animated.Value(1)).current

  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        Animated.spring(scale, { toValue: motion.pressScale, useNativeDriver: true, speed: 40, bounciness: 0 }).start()
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start()
        onPressOut?.(event)
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  )
}
