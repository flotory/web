import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'

import { motion } from '../theme'

/** Fades in once when `ready` becomes true — does not reset on later re-renders. */
export function useFadeOnReady(ready: boolean, durationMs = motion.fadeInMs) {
  const fade = useRef(new Animated.Value(0)).current
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!ready || hasAnimated.current) {
      return
    }

    hasAnimated.current = true
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: durationMs, useNativeDriver: true }).start()
  }, [durationMs, fade, ready])

  return fade
}
