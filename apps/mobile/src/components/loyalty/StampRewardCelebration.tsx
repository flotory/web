import { useEffect, useRef } from 'react'
import { Animated, Modal, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows } from '../../theme'

interface StampRewardCelebrationProps {
  visible: boolean
  title?: string
  subtitle?: string
}

export default function StampRewardCelebration({ visible, title, subtitle }: StampRewardCelebrationProps) {
  const scale = useRef(new Animated.Value(0.82)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.82)
      opacity.setValue(0)
      return
    }

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start()
  }, [opacity, scale, visible])

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.28)',
          paddingHorizontal: 24,
        }}
      >
        <Animated.View
          style={{
            opacity,
            transform: [{ scale }],
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            paddingHorizontal: 28,
            paddingVertical: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.accentBorder,
            maxWidth: 320,
            width: '100%',
            ...shadows.md,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 36 }}>🎁</Text>
          </View>
          <Text style={withAppFont({ marginTop: 14, fontSize: 22, fontWeight: '800', color: colors.ink })}>
            Reward unlocked!
          </Text>
          {title ? (
            <Text style={withAppFont({ marginTop: 6, fontSize: 15, fontWeight: '600', color: colors.inkMuted, textAlign: 'center' })}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={{ ...typographyMuted(), marginTop: 8, textAlign: 'center' }}>{subtitle}</Text>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  )
}

function typographyMuted() {
  return { fontSize: 14, color: colors.inkSoft, lineHeight: 20 }
}
