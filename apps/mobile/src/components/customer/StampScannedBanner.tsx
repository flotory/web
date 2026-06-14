import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { Animated, PanResponder, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { withAppFont } from '../../lib/typography'
import { colors, motion } from '../../theme'

interface StampScannedBannerProps {
  visible: boolean
  title: string
  subtitle?: string
  onPress?: () => void
  onDismiss: () => void
  autoHideMs?: number
}

export default function StampScannedBanner({
  visible,
  title,
  subtitle,
  onPress,
  onDismiss,
  autoHideMs = motion.stampBannerShowMs,
}: StampScannedBannerProps) {
  const insets = useSafeAreaInsets()
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(-10)).current
  const dragY = useRef(new Animated.Value(0)).current
  const dismissingRef = useRef(false)

  const dismiss = (targetY = -24) => {
    if (dismissingRef.current) return
    dismissingRef.current = true
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: targetY, duration: 180, useNativeDriver: true }),
      Animated.timing(dragY, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDismiss()
      dismissingRef.current = false
    })
  }

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0)
      translateY.setValue(-10)
      dragY.setValue(0)
      dismissingRef.current = false
      return
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, friction: 9, tension: 100, useNativeDriver: true }),
    ]).start()

    const timer = setTimeout(() => dismiss(-6), autoHideMs)

    return () => clearTimeout(timer)
  }, [visible, autoHideMs, dragY, onDismiss, opacity, translateY])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) {
          dragY.setValue(gesture.dy)
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -22 || gesture.vy < -0.55) {
          dismiss(-28)
          return
        }
        Animated.spring(dragY, { toValue: 0, friction: 8, tension: 120, useNativeDriver: true }).start()
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, { toValue: 0, friction: 8, tension: 120, useNativeDriver: true }).start()
      },
    }),
  ).current

  if (!visible) {
    return null
  }

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderWidth: 1.5,
        borderColor: colors.successBorder,
        shadowColor: colors.ink,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
        elevation: 6,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.successBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="checkmark-circle" size={22} color={colors.successText} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={withAppFont({ fontSize: 16, fontWeight: '700', color: colors.ink })} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 13, color: colors.inkMuted, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.successText })}>View</Text>
      ) : null}
    </View>
  )

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 14,
        right: 14,
        zIndex: 220,
        opacity,
        transform: [{ translateY }, { translateY: dragY }],
      }}
      {...panResponder.panHandlers}
    >
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="View loyalty card">
          {content}
        </Pressable>
      ) : (
        content
      )}
    </Animated.View>
  )
}
