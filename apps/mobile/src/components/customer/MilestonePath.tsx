import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing, Text, View } from 'react-native'

import { colors, motion, rewardReady } from '../../theme'
import { withAppFont } from '../../lib/typography'

interface MilestonePathProps {
  collected: number
  total: number
  milestoneStamp?: number
  milestoneStamps?: number[]
  /** Stamp positions where the reward was redeemed */
  claimedStamps?: number[]
  /** Stamp slots animating after a live scan */
  highlightStamps?: number[]
  /** Milestone stamp position playing a one-shot gift unlock pulse */
  celebrateGiftStamp?: number | null
  columns?: number
  sizeScale?: number
  /** Replaces the cell at `total` (goal slot at end of journey). */
  endSlot?: ReactNode
  /** Show stamp index on empty slots */
  showStampNumbers?: boolean
}

const CELL_SIZE = 38

export default function MilestonePath({
  collected,
  total,
  milestoneStamp,
  milestoneStamps,
  claimedStamps = [],
  highlightStamps = [],
  celebrateGiftStamp = null,
  columns = 5,
  sizeScale = 1,
  endSlot,
  showStampNumbers = false,
}: MilestonePathProps) {
  const size = Math.round(CELL_SIZE * sizeScale)
  const cellGap = Math.round(5 * sizeScale)
  const gifts = new Set((milestoneStamps?.length ? milestoneStamps : [milestoneStamp ?? total]).filter(Boolean) as number[])
  const claimed = new Set(claimedStamps)
  const highlighted = new Set(highlightStamps)
  const stampPulse = useRef(new Animated.Value(1)).current
  const giftPulse = useRef(new Animated.Value(1)).current
  const giftGlow = useRef(new Animated.Value(0.18)).current
  const giftLift = useRef(new Animated.Value(0)).current
  const celebrateScale = useRef(new Animated.Value(1)).current
  const celebrateRotate = useRef(new Animated.Value(0)).current
  const celebrateGlow = useRef(new Animated.Value(0)).current
  const celebrateBurst = useRef(new Animated.Value(0)).current

  const hasUpcomingGift = [...gifts].some((stamp) => stamp > collected && !claimed.has(stamp))
  const hasHighlight = highlightStamps.length > 0

  useEffect(() => {
    if (!hasHighlight) {
      stampPulse.setValue(1)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(stampPulse, { toValue: 1.1, duration: 320, useNativeDriver: true }),
        Animated.timing(stampPulse, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => {
      loop.stop()
      stampPulse.setValue(1)
    }
  }, [hasHighlight, stampPulse])

  useEffect(() => {
    if (!hasUpcomingGift) return
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(giftPulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
          Animated.timing(giftPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(giftGlow, { toValue: 0.28, duration: 700, useNativeDriver: true }),
          Animated.timing(giftGlow, { toValue: 0.18, duration: 700, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(giftLift, { toValue: -1, duration: 700, useNativeDriver: true }),
          Animated.timing(giftLift, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ]),
    )
    loop.start()
    return () => {
      loop.stop()
      giftPulse.setValue(1)
      giftGlow.setValue(0.18)
      giftLift.setValue(0)
    }
  }, [giftGlow, giftLift, giftPulse, hasUpcomingGift])

  useEffect(() => {
    if (celebrateGiftStamp == null) {
      celebrateScale.setValue(1)
      celebrateRotate.setValue(0)
      celebrateGlow.setValue(0)
      celebrateBurst.setValue(0)
      return
    }

    celebrateScale.setValue(0.82)
    celebrateRotate.setValue(0)
    celebrateGlow.setValue(0)
    celebrateBurst.setValue(0)

    const wiggle = Animated.sequence([
      Animated.timing(celebrateRotate, { toValue: 1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(celebrateRotate, { toValue: -1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(celebrateRotate, { toValue: 0.6, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(celebrateRotate, { toValue: -0.6, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(celebrateRotate, { toValue: 0, duration: 60, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ])

    Animated.parallel([
      Animated.spring(celebrateScale, { toValue: 1.22, friction: 4.5, tension: 145, useNativeDriver: true }),
      Animated.timing(celebrateGlow, { toValue: 0.72, duration: 240, useNativeDriver: true }),
      Animated.timing(celebrateBurst, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      wiggle,
    ]).start(() => {
      Animated.parallel([
        Animated.spring(celebrateScale, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
        Animated.timing(celebrateGlow, { toValue: 0, duration: 520, useNativeDriver: true }),
        Animated.timing(celebrateBurst, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start()
    })
  }, [celebrateBurst, celebrateGiftStamp, celebrateGlow, celebrateRotate, celebrateScale])

  const celebrateRotateDeg = celebrateRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [`-${motion.giftBellRotateDeg}deg`, '0deg', `${motion.giftBellRotateDeg}deg`],
  })
  const burstScale = celebrateBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1.35],
  })
  const burstOpacity = celebrateBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  })

  function wrapCelebrate(stamp: number, node: ReactNode) {
    if (celebrateGiftStamp !== stamp) {
      return node
    }

    return (
      <Animated.View
        style={{
          transform: [{ scale: celebrateScale }, { rotate: celebrateRotateDeg }],
          shadowColor: colors.accent,
          shadowOpacity: celebrateGlow,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 5 },
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: -5,
            right: -5,
            top: -5,
            bottom: -5,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: colors.accent,
            opacity: burstOpacity,
            transform: [{ scale: burstScale }],
          }}
        />
        {node}
      </Animated.View>
    )
  }

  function renderCell(stamp: number) {
    if (endSlot && stamp === total) {
      return (
        <View key={stamp} style={{ alignItems: 'center', justifyContent: 'center' }}>
          {wrapCelebrate(stamp, endSlot)}
        </View>
      )
    }

    const filled = stamp <= collected
    const isGift = gifts.has(stamp)
    const isClaimed = isGift && claimed.has(stamp)
    const isCelebrating = celebrateGiftStamp === stamp
    const borderRadius = size / 2

    if (isClaimed) {
      return (
        <View key={stamp}>
          <View
            style={{
              width: size,
              height: size,
              borderRadius,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons name="checkmark-done" size={Math.round(16 * sizeScale)} color={colors.inkMuted} />
          </View>
        </View>
      )
    }

    let backgroundColor = colors.surface
    let borderColor = colors.border
    let textColor = showStampNumbers && !filled && !isGift ? colors.inkMuted : colors.inkSoft

    if (filled) {
      backgroundColor = colors.accent
      borderColor = colors.accentBorder
      textColor = colors.primary
    } else if (isGift) {
      backgroundColor = colors.accentSoft
      borderColor = colors.accentBorder
      textColor = colors.accentActive
    }

    const content = isCelebrating ? null : filled ? '✓' : showStampNumbers ? String(stamp) : ''
    const celebrateBackground = colors.accent
    const celebrateBorder = colors.accentActive

    const cell = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isCelebrating ? celebrateBackground : backgroundColor,
          borderWidth: isCelebrating ? 1.5 : 1,
          borderColor: isCelebrating ? celebrateBorder : borderColor,
        }}
      >
        {isCelebrating ? (
          <Ionicons name={rewardReady.iconName} size={Math.round((rewardReady.iconSize + 2) * sizeScale)} color={colors.primary} />
        ) : isGift && !filled ? (
          <Ionicons
            name="gift-outline"
            size={Math.round(13 * sizeScale)}
            color={colors.accentActive}
          />
        ) : content ? (
          <Text
            style={withAppFont({
              fontSize: Math.round(14 * sizeScale),
              fontWeight: '800',
              color: textColor,
            })}
          >
            {content}
          </Text>
        ) : null}
      </View>
    )

    if (isCelebrating) {
      return <View key={stamp}>{wrapCelebrate(stamp, cell)}</View>
    }

    if (isGift && !filled) {
      return (
        <Animated.View
          key={stamp}
          style={{
            transform: [{ scale: giftPulse }, { translateY: giftLift }],
            shadowColor: colors.accent,
            shadowOpacity: giftGlow,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          {cell}
        </Animated.View>
      )
    }

    if (highlighted.has(stamp)) {
      return (
        <Animated.View
          key={stamp}
          style={{
            transform: [{ scale: stampPulse }],
            shadowColor: colors.accent,
            shadowOpacity: 0.28,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          {cell}
        </Animated.View>
      )
    }

    return <View key={stamp}>{cell}</View>
  }

  const stamps = Array.from({ length: total }, (_, index) => index + 1)
  const rows: number[][] = []
  for (let index = 0; index < stamps.length; index += columns) {
    rows.push(stamps.slice(index, index + columns))
  }

  return (
    <View style={{ gap: cellGap, alignItems: 'center' }}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={{ flexDirection: 'row', gap: cellGap, justifyContent: 'center' }}>
          {row.map((stamp) => (
            <View key={stamp} style={{ alignItems: 'center' }}>
              {renderCell(stamp)}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
