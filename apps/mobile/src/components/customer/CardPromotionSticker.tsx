import { useEffect, useRef } from 'react'
import { Animated, Easing, Platform, Text, View } from 'react-native'

import { usePulseRing } from '../../hooks/usePulseRing'
import { withAppFont } from '../../lib/typography'
import { colors, motion, shadows } from '../../theme'

interface CardPromotionStickerProps {
  multiplier: number
}

const STICKER_SIZE = 68
const RING_SIZE = 72
const CONTAINER_SIZE = 108

export default function CardPromotionSticker({ multiplier }: CardPromotionStickerProps) {
  const ringOne = usePulseRing(true, 0, { maxScale: 1.55, startOpacity: 0.36, durationMs: 2400 })
  const ringTwo = usePulseRing(true, 800, { maxScale: 1.55, startOpacity: 0.36, durationMs: 2400 })
  const ringThree = usePulseRing(true, 1600, { maxScale: 1.55, startOpacity: 0.36, durationMs: 2400 })
  const badgeScale = useRef(new Animated.Value(1)).current
  const coreGlow = useRef(new Animated.Value(0.62)).current

  useEffect(() => {
    const badgeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: 1.04,
          duration: motion.ctaPulseMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: motion.ctaPulseMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(coreGlow, {
          toValue: 0.85,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(coreGlow, {
          toValue: 0.62,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )

    badgeLoop.start()
    glowLoop.start()

    return () => {
      badgeLoop.stop()
      glowLoop.stop()
    }
  }, [badgeScale, coreGlow])

  const rings = [ringOne, ringTwo, ringThree]

  return (
    <View
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        width: CONTAINER_SIZE,
        height: CONTAINER_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '12deg' }],
      }}
    >
      {rings.map((ring, index) => (
        <Animated.View
          key={index}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: RING_SIZE,
            height: RING_SIZE,
            borderRadius: RING_SIZE / 2,
            borderWidth: 2,
            borderColor: colors.accent,
            opacity: ring.opacity,
            transform: [{ scale: ring.scale }],
          }}
        />
      ))}

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: STICKER_SIZE + 20,
          height: STICKER_SIZE + 20,
          borderRadius: (STICKER_SIZE + 20) / 2,
          backgroundColor: colors.accent,
          opacity: coreGlow.interpolate({
            inputRange: [0.62, 0.85],
            outputRange: [0.1, 0.22],
          }),
          transform: [{ scale: badgeScale }],
        }}
      />

      <Animated.View
        style={{
          width: STICKER_SIZE,
          height: STICKER_SIZE,
          borderRadius: STICKER_SIZE / 2,
          backgroundColor: colors.campaignBg,
          borderWidth: 2.5,
          borderColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: badgeScale }],
          ...(Platform.OS === 'ios' ? shadows.md : { elevation: 5 }),
          shadowColor: colors.accent,
          shadowOpacity: 0.22,
        }}
      >
        <Text style={withAppFont({ fontSize: 20, fontWeight: '900', color: colors.accent, lineHeight: 22 })}>
          {multiplier}×
        </Text>
        <Text
          style={withAppFont({
            fontSize: 7,
            fontWeight: '800',
            letterSpacing: 0.7,
            color: colors.primaryText,
            marginTop: 1,
          })}
        >
          STAMPS
        </Text>
        <Text
          style={withAppFont({
            fontSize: 7,
            fontWeight: '800',
            letterSpacing: 0.5,
            color: colors.accent,
            marginTop: 2,
          })}
        >
          ACTIVE
        </Text>
      </Animated.View>
    </View>
  )
}
