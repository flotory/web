import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing, ScrollView, Text, View } from 'react-native'

import ShadowPulse from '../ui/ShadowPulse'
import { colors, motion, rewardReady } from '../../theme'
import { withAppFont } from '../../lib/typography'

interface MilestonePathProps {
  collected: number
  total: number
  milestoneStamp?: number
  milestoneStamps?: number[]
  /** Stamp positions where the reward was redeemed — static, smaller cells */
  claimedStamps?: number[]
  /** Stamp slots animating after a live scan */
  highlightStamps?: number[]
  /** Milestone stamp position playing a one-shot gift unlock pulse */
  celebrateGiftStamp?: number | null
  columns?: number
  sizeScale?: number
  cellShape?: 'rounded' | 'circle'
  /** Single horizontal row (scrolls when needed). */
  layout?: 'grid' | 'row'
  /** Replaces the cell at `total` (goal slot at end of journey). */
  endSlot?: ReactNode
  /** Show stamp index on empty slots (clearer grids). */
  showStampNumbers?: boolean
}

export default function MilestonePath({
  collected,
  total,
  milestoneStamp,
  milestoneStamps,
  claimedStamps = [],
  highlightStamps = [],
  celebrateGiftStamp = null,
  columns,
  sizeScale = 1,
  cellShape = 'rounded',
  layout = 'grid',
  endSlot,
  showStampNumbers = false,
}: MilestonePathProps) {
  const defaultSize = Math.round((cellShape === 'circle' ? 32 : 44) * sizeScale)
  const cellGap = Math.round(8 * sizeScale)
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
      return
    }

    celebrateScale.setValue(0.9)
    celebrateRotate.setValue(0)
    celebrateGlow.setValue(0)

    const wiggle = Animated.sequence([
      Animated.timing(celebrateRotate, { toValue: 1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(celebrateRotate, { toValue: -1, duration: 80, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(celebrateRotate, { toValue: 0.6, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(celebrateRotate, { toValue: -0.6, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(celebrateRotate, { toValue: 0, duration: 60, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ])

    Animated.parallel([
      Animated.spring(celebrateScale, { toValue: 1.1, friction: 5, tension: 120, useNativeDriver: true }),
      Animated.timing(celebrateGlow, { toValue: 0.42, duration: 260, useNativeDriver: true }),
      wiggle,
    ]).start(() => {
      Animated.parallel([
        Animated.spring(celebrateScale, { toValue: 1, friction: 8, tension: 90, useNativeDriver: true }),
        Animated.timing(celebrateGlow, { toValue: 0, duration: 480, useNativeDriver: true }),
      ]).start()
    })
  }, [celebrateGiftStamp, celebrateGlow, celebrateRotate, celebrateScale])

  const celebrateRotateDeg = celebrateRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [`-${motion.giftBellRotateDeg}deg`, '0deg', `${motion.giftBellRotateDeg}deg`],
  })

  function wrapCelebrate(stamp: number, node: ReactNode) {
    if (celebrateGiftStamp !== stamp) {
      return node
    }

    return (
      <Animated.View
        style={{
          transform: [{ scale: celebrateScale }, { rotate: celebrateRotateDeg }],
          shadowColor: '#F59E0B',
          shadowOpacity: celebrateGlow,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
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

    let backgroundColor = '#FFFFFF'
    let borderColor = '#E2E8F0'
    let textColor = showStampNumbers && !filled && !isGift ? colors.inkSoft : '#94A3B8'

    if (filled) {
      backgroundColor = cellShape === 'circle' ? colors.success : colors.successBg
      borderColor = colors.successBorder
      textColor = cellShape === 'circle' ? '#FFFFFF' : colors.successText
    } else if (isGift) {
      backgroundColor = '#FEF9C3'
      borderColor = '#FDE68A'
      textColor = '#A16207'
    } else if (cellShape === 'circle') {
      backgroundColor = '#FFFFFF'
      borderColor = '#E2E8F0'
    }

    const size = defaultSize
    const content = isCelebrating ? null : filled ? '✓' : isGift ? '🎁' : showStampNumbers ? String(stamp) : ''
    const borderRadius = cellShape === 'circle' ? size / 2 : Math.round(14 * sizeScale)
    const celebrateBackground = '#FEF9C3'
    const celebrateBorder = '#FCD34D'

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
          <Ionicons name={rewardReady.iconName} size={Math.round(rewardReady.iconSize * sizeScale)} color={rewardReady.iconColor} />
        ) : content ? (
          <Text
            style={withAppFont({
              fontSize: Math.round((filled ? 13 : isGift ? 14 : 12) * sizeScale),
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

    if (isClaimed) {
      return (
        <ShadowPulse key={stamp}>
          {cell}
        </ShadowPulse>
      )
    }

    if (isGift && !filled) {
      return (
        <Animated.View
          key={stamp}
          style={{
            transform: [{ scale: giftPulse }, { translateY: giftLift }],
            shadowColor: '#F59E0B',
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
            shadowColor: colors.success,
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

  if (columns && columns > 0) {
    const stamps = Array.from({ length: total }, (_, index) => index + 1)
    const rows: number[][] = []
    for (let index = 0; index < stamps.length; index += columns) {
      rows.push(stamps.slice(index, index + columns))
    }

    return (
      <View style={{ gap: cellGap }}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={{ flexDirection: 'row', gap: cellGap }}>
            {row.map((stamp) => (
              <View key={stamp} style={{ flex: 1, alignItems: 'center' }}>
                {renderCell(stamp)}
              </View>
            ))}
            {Array.from({ length: Math.max(columns - row.length, 0) }, (_, spacer) => (
              <View key={`spacer-${rowIndex}-${spacer}`} style={{ flex: 1 }} />
            ))}
          </View>
        ))}
      </View>
    )
  }

  const stamps = Array.from({ length: total }, (_, index) => index + 1)

  if (layout === 'row') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: cellGap, paddingVertical: 2, paddingRight: 4 }}
      >
        {stamps.map((stamp) => renderCell(stamp))}
      </ScrollView>
    )
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: cellGap }}>
      {stamps.map((stamp) => renderCell(stamp))}
    </View>
  )
}
