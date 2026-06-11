import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, Animated, Easing, Text, View } from 'react-native'

export type NfcStampScanPhase = 'idle' | 'checking' | 'scanning' | 'stamping' | 'error' | 'unsupported'
import { withAppFont } from '../../lib/typography'
import { colors, motion, shadows } from '../../theme'

function phaseHint(phase: NfcStampScanPhase): string {
  switch (phase) {
    case 'checking':
      return 'Starting NFC…'
    case 'scanning':
      return 'Hold near the stand'
    case 'stamping':
      return 'Adding your stamp…'
    case 'unsupported':
      return 'Tap the physical tag to open Flotory'
    default:
      return 'Hold your phone near the NFC stand'
  }
}

const HERO_ICON_SIZE = 64

const HERO_SIZE = 272
const CORE_SIZE = 136
const RING_SIZE = 156

function usePulseRing(active: boolean, delayMs: number) {
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(0.38)).current

  useEffect(() => {
    if (!active) {
      scale.setValue(1)
      opacity.setValue(0.14)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.62,
            duration: 2400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.38, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    )

    loop.start()
    return () => loop.stop()
  }, [active, delayMs, opacity, scale])

  return { scale, opacity }
}

interface NfcStampPulseHeroProps {
  phase: NfcStampScanPhase
  showHint?: boolean
}

export default function NfcStampPulseHero({ phase, showHint = true }: NfcStampPulseHeroProps) {
  const ringsActive = phase === 'checking' || phase === 'scanning' || phase === 'stamping'
  const gentlePulse = phase === 'idle' || phase === 'error'
  const ringOne = usePulseRing(ringsActive, 0)
  const ringTwo = usePulseRing(ringsActive, 800)
  const ringThree = usePulseRing(ringsActive, 1600)
  const iconScale = useRef(new Animated.Value(1)).current
  const coreGlow = useRef(new Animated.Value(0.55)).current

  useEffect(() => {
    if (!gentlePulse && !ringsActive) {
      iconScale.setValue(1)
      coreGlow.setValue(0.55)
      return
    }

    const iconLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: ringsActive ? 1.08 : 1.04,
          duration: ringsActive ? 1100 : motion.ctaPulseMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: ringsActive ? 1100 : motion.ctaPulseMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(coreGlow, {
          toValue: ringsActive ? 1 : 0.78,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(coreGlow, {
          toValue: ringsActive ? 0.55 : 0.62,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )

    iconLoop.start()
    glowLoop.start()

    return () => {
      iconLoop.stop()
      glowLoop.stop()
    }
  }, [coreGlow, gentlePulse, iconScale, ringsActive])

  const iconColor = phase === 'unsupported' ? colors.inkSoft : colors.accentActive
  const coreBackground = phase === 'unsupported' ? colors.surfaceMuted : colors.accentSoft
  const coreBorder = phase === 'unsupported' ? colors.border : colors.accentBorder

  const rings = [ringOne, ringTwo, ringThree]

  return (
    <View style={{ alignItems: 'center', gap: 20 }}>
    <View
      style={{
        width: HERO_SIZE,
        height: HERO_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
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
          width: CORE_SIZE + 28,
          height: CORE_SIZE + 28,
          borderRadius: (CORE_SIZE + 28) / 2,
          backgroundColor: colors.accent,
          opacity: coreGlow.interpolate({
            inputRange: [0.55, 1],
            outputRange: [0.08, 0.2],
          }),
          transform: [{ scale: iconScale }],
        }}
      />

      <Animated.View
        style={{
          width: CORE_SIZE,
          height: CORE_SIZE,
          borderRadius: CORE_SIZE / 2,
          backgroundColor: coreBackground,
          borderWidth: 2,
          borderColor: coreBorder,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: iconScale }],
          ...shadows.md,
          shadowColor: colors.accent,
          shadowOpacity: ringsActive ? 0.28 : 0.12,
        }}
      >
        <View
          style={{
            width: CORE_SIZE - 8,
            height: CORE_SIZE - 8,
            borderRadius: (CORE_SIZE - 8) / 2,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {phase === 'stamping' ? (
            <ActivityIndicator color={colors.accentActive} size="large" />
          ) : (
            <Ionicons name="radio-outline" size={HERO_ICON_SIZE} color={iconColor} />
          )}
        </View>
      </Animated.View>
    </View>

      {showHint ? (
        <Text
          style={withAppFont({
            fontSize: 22,
            fontWeight: '800',
            color: colors.ink,
            textAlign: 'center',
            lineHeight: 28,
            paddingHorizontal: 12,
            maxWidth: 300,
          })}
        >
          {phaseHint(phase)}
        </Text>
      ) : null}
    </View>
  )
}
