import { Animated } from 'react-native'
import { useEffect, useRef } from 'react'

import { colors } from '../../theme'

interface SkeletonBlockProps {
  height: number
  width?: number | `${number}%` | 'auto'
  borderRadius?: number
}

export default function SkeletonBlock({ height, width = '100%', borderRadius = 12 }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <Animated.View
      style={{
        opacity,
        height,
        width,
        borderRadius,
        backgroundColor: colors.surfaceMuted,
      }}
    />
  )
}
