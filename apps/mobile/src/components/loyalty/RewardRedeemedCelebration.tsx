import { useEffect, useRef } from 'react'
import { Animated, Modal, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows } from '../../theme'

interface RewardRedeemedCelebrationProps {
  visible: boolean
  title?: string
  subtitle?: string
}

export default function RewardRedeemedCelebration({ visible, title, subtitle }: RewardRedeemedCelebrationProps) {
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
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
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
            borderColor: colors.successBorder,
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
              backgroundColor: colors.successBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 36 }}>✓</Text>
          </View>
          <Text style={withAppFont({ marginTop: 14, fontSize: 22, fontWeight: '800', color: colors.ink })}>
            Reward used!
          </Text>
          {title ? (
            <Text style={withAppFont({ marginTop: 6, fontSize: 15, fontWeight: '600', color: colors.inkMuted, textAlign: 'center' })}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={{ marginTop: 8, fontSize: 14, color: colors.inkSoft, textAlign: 'center', lineHeight: 20 }}>
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  )
}
