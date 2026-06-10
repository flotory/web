import { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors } from '../../theme'

interface NfcStampSuccessProps {
  title?: string
  subtitle?: string
}

export default function NfcStampSuccess({
  title = '+1 Stamp Added',
  subtitle,
}: NfcStampSuccessProps) {
  const scale = useRef(new Animated.Value(0.88)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, scale])

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ scale }],
        alignItems: 'center',
        paddingVertical: 28,
      }}
    >
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.accentSoft,
          borderWidth: 2,
          borderColor: colors.accentBorder,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={withAppFont({ fontSize: 34, fontWeight: '900', color: colors.accentActive })}>+1</Text>
      </View>
      <Text style={withAppFont({ marginTop: 18, fontSize: 24, fontWeight: '800', color: colors.ink })}>{title}</Text>
      {subtitle ? (
        <Text style={withAppFont({ marginTop: 8, fontSize: 15, fontWeight: '600', color: colors.inkMuted, textAlign: 'center' })}>
          {subtitle}
        </Text>
      ) : null}
    </Animated.View>
  )
}
