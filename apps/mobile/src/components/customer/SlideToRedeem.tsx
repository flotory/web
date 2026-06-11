import { Ionicons } from '@expo/vector-icons'
import { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Animated, PanResponder, Text, View, type LayoutChangeEvent } from 'react-native'

import { hapticSuccess } from '../../lib/haptics'
import { withAppFont } from '../../lib/typography'
import { colors, shadows } from '../../theme'

const THUMB_SIZE = 52
const TRACK_HEIGHT = 58
const COMPLETE_RATIO = 0.82

interface SlideToRedeemProps {
  onRedeem: () => Promise<void>
  disabled?: boolean
}

export default function SlideToRedeem({ onRedeem, disabled = false }: SlideToRedeemProps) {
  const [trackWidth, setTrackWidth] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const dragX = useRef(new Animated.Value(0)).current
  const completedRef = useRef(false)
  const maxDragRef = useRef(0)
  const disabledRef = useRef(disabled)
  const submittingRef = useRef(submitting)
  const onRedeemRef = useRef(onRedeem)

  disabledRef.current = disabled
  submittingRef.current = submitting
  onRedeemRef.current = onRedeem
  maxDragRef.current = Math.max(trackWidth - THUMB_SIZE - 8, 0)

  const maxDrag = maxDragRef.current

  function resetThumb() {
    Animated.spring(dragX, {
      toValue: 0,
      friction: 7,
      tension: 80,
      useNativeDriver: false,
    }).start()
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current && !submittingRef.current,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !disabledRef.current && !submittingRef.current && Math.abs(gesture.dx) > 4,
        onPanResponderGrant: () => {
          dragX.stopAnimation()
        },
        onPanResponderMove: (_, gesture) => {
          if (disabledRef.current || submittingRef.current || completedRef.current) {
            return
          }

          const limit = maxDragRef.current
          const next = Math.min(Math.max(gesture.dx, 0), limit)
          dragX.setValue(next)
        },
        onPanResponderRelease: (_, gesture) => {
          const limit = maxDragRef.current
          if (disabledRef.current || submittingRef.current || completedRef.current || limit <= 0) {
            resetThumb()
            return
          }

          const progress = gesture.dx / limit
          if (progress < COMPLETE_RATIO) {
            resetThumb()
            return
          }

          completedRef.current = true
          dragX.setValue(limit)
          setSubmitting(true)

          void (async () => {
            try {
              await onRedeemRef.current()
              void hapticSuccess()
            } catch {
              completedRef.current = false
              resetThumb()
            } finally {
              setSubmitting(false)
            }
          })()
        },
        onPanResponderTerminate: () => {
          if (!completedRef.current) {
            resetThumb()
          }
        },
      }),
    [dragX],
  )

  function onTrackLayout(event: LayoutChangeEvent) {
    setTrackWidth(event.nativeEvent.layout.width)
  }

  const labelOpacity = dragX.interpolate({
    inputRange: [0, Math.max(maxDrag * 0.35, 1)],
    outputRange: [1, 0.35],
    extrapolate: 'clamp',
  })

  return (
    <View
      testID="slide-to-redeem-track"
      onLayout={onTrackLayout}
      collapsable={false}
      style={{
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        backgroundColor: colors.primary,
        borderWidth: 1,
        borderColor: colors.primarySoft,
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: disabled ? 0.55 : 1,
        ...shadows.button,
      }}
    >
      <Animated.Text
        pointerEvents="none"
        style={[
          withAppFont({
            position: 'absolute',
            alignSelf: 'center',
            fontSize: 15,
            fontWeight: '800',
            color: colors.primaryText,
            letterSpacing: 0.3,
          }),
          { opacity: labelOpacity },
        ]}
      >
        Slide to redeem
      </Animated.Text>

      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: 4,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: dragX }],
          ...shadows.md,
          shadowColor: colors.ink,
        }}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        )}
      </Animated.View>
    </View>
  )
}
