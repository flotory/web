import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

import { motion } from '../theme'

export function useFadeOnReady(ready: boolean, durationMs = motion.fadeInMs) {
  const fade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!ready) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: durationMs, useNativeDriver: true }).start()
  }, [durationMs, fade, ready])

  return fade
}
