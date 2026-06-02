import { Ionicons } from '@expo/vector-icons'
import { useCallback, useEffect, useRef } from 'react'
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native'

import { motion, rewardReady } from '../../theme'

interface ShakeGiftBadgeProps {
  style?: StyleProp<ViewStyle>
}

export default function ShakeGiftBadge({ style }: ShakeGiftBadgeProps) {
  const rotate = useRef(new Animated.Value(0)).current

  const runBellShake = useCallback(() => {
    rotate.setValue(0)
    Animated.sequence([
      Animated.timing(rotate, { toValue: 1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -1, duration: 70, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0.75, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -0.75, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0.35, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: -0.35, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: 0, duration: 45, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start()
  }, [rotate])

  useEffect(() => {
    const interval = setInterval(runBellShake, motion.giftBellIntervalMs)
    return () => clearInterval(interval)
  }, [runBellShake])

  const deg = motion.giftBellRotateDeg
  const bellRotate = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [`-${deg}deg`, '0deg', `${deg}deg`],
  })

  return (
    <View
      style={[
        {
          width: rewardReady.badgeSize,
          height: rewardReady.badgeSize,
          borderRadius: rewardReady.badgeRadius,
          backgroundColor: rewardReady.backgroundColor,
          borderWidth: 1,
          borderColor: rewardReady.borderColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Animated.View style={{ transform: [{ rotate: bellRotate }] }}>
        <Ionicons name={rewardReady.iconName} size={rewardReady.iconSize} color={rewardReady.iconColor} />
      </Animated.View>
    </View>
  )
}
