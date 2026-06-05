import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef } from 'react'
import { Animated, Text, View } from 'react-native'

import PrimaryButton from '../ui/PrimaryButton'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows, space } from '../../theme'

interface RewardRedeemedSuccessCardProps {
  rewardTitle: string
  venueName?: string | null
  onBackToWallet: () => void
  animateIn?: boolean
  /** When true, parent should center this block; removes top margin */
  centered?: boolean
}

export default function RewardRedeemedSuccessCard({
  rewardTitle,
  venueName,
  onBackToWallet,
  animateIn = true,
  centered = false,
}: RewardRedeemedSuccessCardProps) {
  const scale = useRef(new Animated.Value(animateIn ? 0.92 : 1)).current
  const opacity = useRef(new Animated.Value(animateIn ? 0 : 1)).current
  const iconScale = useRef(new Animated.Value(animateIn ? 0.6 : 1)).current

  useEffect(() => {
    if (!animateIn) {
      return
    }

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
    ]).start()
  }, [animateIn, iconScale, opacity, scale])

  return (
    <Animated.View
      style={{
        width: '100%',
        opacity,
        transform: [{ scale }],
        ...(centered ? {} : { marginTop: space.sectionY }),
      }}
    >
      <View
        style={{
          borderRadius: radius.card + 4,
          overflow: 'hidden',
          borderWidth: 1.5,
          borderColor: colors.successBorder,
          ...shadows.md,
        }}
      >
        <LinearGradient
          colors={['#FFFFFF', colors.successBg, '#D1FAE5']}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 28, alignItems: 'center' }}
        >
          <Animated.View
            style={{
              transform: [{ scale: iconScale }],
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.success,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.success,
              shadowOpacity: 0.35,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Ionicons name="checkmark-circle" size={56} color="#FFFFFF" />
          </Animated.View>

          <Text
            style={withAppFont({
              marginTop: 22,
              fontSize: 28,
              fontWeight: '800',
              color: colors.ink,
              textAlign: 'center',
              letterSpacing: -0.5,
            })}
          >
            Reward redeemed
          </Text>

          <Text
            style={withAppFont({
              marginTop: 10,
              fontSize: 20,
              fontWeight: '700',
              color: colors.plum,
              textAlign: 'center',
              lineHeight: 26,
            })}
          >
            {rewardTitle}
          </Text>

          {venueName ? (
            <View
              style={{
                marginTop: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                borderRadius: 999,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: colors.successBorder,
              }}
            >
              <Ionicons name="storefront-outline" size={16} color={colors.successText} />
              <Text style={withAppFont({ fontSize: 14, fontWeight: '600', color: colors.successText })}>{venueName}</Text>
            </View>
          ) : null}

          <Text
            style={{
              marginTop: 14,
              fontSize: 15,
              lineHeight: 22,
              color: colors.inkMuted,
              textAlign: 'center',
              maxWidth: 280,
            }}
          >
            Staff completed the redemption. Your reward is marked as used in your wallet.
          </Text>
        </LinearGradient>
      </View>

      <View style={{ marginTop: 20 }}>
        <PrimaryButton
          label="Back to wallet"
          icon="wallet-outline"
          onPress={onBackToWallet}
          pulse
          style={{ width: '100%' }}
        />
      </View>
    </Animated.View>
  )
}
