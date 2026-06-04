import { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'

import ShadowPulse from '../ui/ShadowPulse'
import { colors } from '../../theme'
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
  columns?: number
  sizeScale?: number
}

export default function MilestonePath({
  collected,
  total,
  milestoneStamp,
  milestoneStamps,
  claimedStamps = [],
  highlightStamps = [],
  columns,
  sizeScale = 1,
}: MilestonePathProps) {
  const defaultSize = Math.round(44 * sizeScale)
  const cellGap = Math.round(8 * sizeScale)
  const gifts = new Set((milestoneStamps?.length ? milestoneStamps : [milestoneStamp ?? total]).filter(Boolean) as number[])
  const claimed = new Set(claimedStamps)
  const highlighted = new Set(highlightStamps)
  const stampPulse = useRef(new Animated.Value(1)).current
  const giftPulse = useRef(new Animated.Value(1)).current
  const giftGlow = useRef(new Animated.Value(0.18)).current
  const giftLift = useRef(new Animated.Value(0)).current

  const hasUpcomingGift = [...gifts].some((stamp) => stamp > collected && !claimed.has(stamp))
  const hasHighlight = highlightStamps.length > 0

  useEffect(() => {
    if (!hasHighlight) {
      stampPulse.setValue(1)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(stampPulse, { toValue: 1.12, duration: 280, useNativeDriver: true }),
        Animated.timing(stampPulse, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
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

  function renderCell(stamp: number) {
    const filled = stamp <= collected
    const isGift = gifts.has(stamp)
    const isClaimed = isGift && claimed.has(stamp)

    let backgroundColor = '#FFFFFF'
    let borderColor = '#E2E8F0'
    let textColor = '#94A3B8'

    if (filled) {
      backgroundColor = colors.successBg
      borderColor = colors.successBorder
      textColor = colors.successText
    } else if (isGift) {
      backgroundColor = '#F1F5F9'
      borderColor = '#E2E8F0'
      textColor = '#94A3B8'
    }

    const size = defaultSize
    const content = filled ? '✓' : isGift ? '🎁' : String(stamp)

    const cell = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(14 * sizeScale),
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
          borderWidth: 1,
          borderColor,
        }}
      >
        <Text style={withAppFont({ fontSize: Math.round((filled ? 14 : isGift ? 16 : 14) * sizeScale), fontWeight: '800', color: textColor })}>
          {content}
        </Text>
      </View>
    )

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
            shadowOpacity: 0.35,
            shadowRadius: 8,
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

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: cellGap }}>
      {stamps.map((stamp) => renderCell(stamp))}
    </View>
  )
}
