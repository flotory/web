import { Ionicons } from '@expo/vector-icons'
import { useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Animated, PanResponder, Text, View, type LayoutChangeEvent } from 'react-native'

import { hapticSuccess } from '../../lib/haptics'
import { withAppFont } from '../../lib/typography'
import { colors } from '../../theme'

const THUMB_SIZE = 54
const TRACK_HEIGHT = 60
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
        backgroundColor: 'rgba(5, 13, 30, 0.92)',
        borderWidth: 1,
        borderColor: 'rgba(215, 163, 93, 0.35)',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: disabled ? 0.55 : 1,
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
        Slide to redeem reward
      </Animated.Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: 3,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.accentBorder,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateX: dragX }],
        }}
      >
        {submitting ? (
          <ActivityIndicator color={colors.accentActive} size="small" />
        ) : (
          <Ionicons name="chevron-forward" size={24} color={colors.accentActive} />
        )}
      </Animated.View>
    </View>
  )
}
