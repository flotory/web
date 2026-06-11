import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

interface UsePulseRingOptions {
  maxScale?: number
  startOpacity?: number
  durationMs?: number
}

export function usePulseRing(active: boolean, delayMs: number, options: UsePulseRingOptions = {}) {
  const maxScale = options.maxScale ?? 1.62
  const startOpacity = options.startOpacity ?? 0.38
  const durationMs = options.durationMs ?? 2400

  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(startOpacity)).current

  useEffect(() => {
    if (!active) {
      scale.setValue(1)
      opacity.setValue(startOpacity * 0.37)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: maxScale,
            duration: durationMs,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: durationMs,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: startOpacity, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    )

    loop.start()
    return () => loop.stop()
  }, [active, delayMs, durationMs, maxScale, opacity, scale, startOpacity])

  return { scale, opacity }
}
