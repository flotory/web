import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Image, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import SlideToRedeem from '../../src/components/customer/SlideToRedeem'
import { CustomerScreenLoading } from '../../src/components/ui/CustomerScreen'
import ScreenGradientLayout from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import StateCard from '../../src/components/ui/StateCard'
import { useRewardsWallet } from '../../src/hooks/useRewardsWallet'
import { invalidateCustomerRewardCaches } from '../../src/lib/customerData'
import { hapticSuccess } from '../../src/lib/haptics'
import { rewardImageUrl, venueLogoUrl } from '../../src/lib/media'
import { redeemUnlock } from '../../src/lib/redeemUnlock'
import { withAppFont } from '../../src/lib/typography'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, radius, shadows, space } from '../../theme'

const MEDIA_SIZE = 84
const MEDIA_RADIUS = 18
const VENUE_LOGO_SIZE = 22

function RedeemPassCard({
  title,
  venueName,
  imageUri,
  logoUri,
}: {
  title: string
  venueName: string
  imageUri: string | null
  logoUri: string | null
}) {
  return (
    <LinearGradient
      colors={['#071225', colors.primary, '#0c1a30']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: radius.card,
        padding: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(215, 163, 93, 0.22)',
        ...shadows.md,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -24,
          right: 48,
          width: 100,
          height: 100,
          borderRadius: 20,
          backgroundColor: 'rgba(215, 163, 93, 0.1)',
          transform: [{ rotate: '12deg' }],
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: 'rgba(215, 163, 93, 0.14)',
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
            <Text style={withAppFont({ fontSize: 10, fontWeight: '800', letterSpacing: 0.9, color: colors.accent })}>
              READY
            </Text>
          </View>

          <Text
            style={withAppFont({
              fontSize: 26,
              fontWeight: '800',
              color: colors.primaryText,
              letterSpacing: -0.5,
              lineHeight: 30,
            })}
            numberOfLines={3}
          >
            {title}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 7,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
            }}
          >
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={{
                  width: VENUE_LOGO_SIZE,
                  height: VENUE_LOGO_SIZE,
                  borderRadius: 7,
                  backgroundColor: colors.surface,
                }}
              />
            ) : (
              <View
                style={{
                  width: VENUE_LOGO_SIZE,
                  height: VENUE_LOGO_SIZE,
                  borderRadius: 7,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="storefront-outline" size={13} color="rgba(255,255,255,0.75)" />
              </View>
            )}
            <Text
              style={withAppFont({ fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.88)' })}
              numberOfLines={1}
            >
              {venueName}
            </Text>
          </View>
        </View>

        <View
          style={{
            width: MEDIA_SIZE,
            height: MEDIA_SIZE,
            borderRadius: MEDIA_RADIUS,
            backgroundColor: colors.surface,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(215, 163, 93, 0.45)',
            ...shadows.sm,
          }}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: MEDIA_SIZE, height: MEDIA_SIZE }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft }}>
              <Ionicons name="gift-outline" size={34} color={colors.accentActive} />
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  )
}

function RedeemSuccessCard() {
  return (
    <View
      style={{
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: radius.card,
        backgroundColor: colors.accentSoft,
        borderWidth: 1,
        borderColor: colors.accentBorder,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="checkmark" size={26} color={colors.accentActive} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={withAppFont({ fontSize: 17, fontWeight: '800', color: colors.ink })}>Redeemed</Text>
        <Text style={withAppFont({ fontSize: 14, fontWeight: '500', color: colors.inkMuted })}>Enjoy your reward!</Text>
      </View>
    </View>
  )
}

export default function RedeemRewardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { token } = useAuth()
  const { unlockId } = useLocalSearchParams<{ unlockId: string }>()
  const { data, loading, error, reload } = useRewardsWallet({ refetchOnFocus: true })
  const [redeemed, setRedeemed] = useState(false)
  const [redeemError, setRedeemError] = useState('')

  const item = useMemo(
    () => data?.items.find((entry) => String(entry.unlock_id) === String(unlockId)),
    [data?.items, unlockId],
  )

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }

    router.replace('/(customer)/home')
  }

  if (loading && !data) {
    return <CustomerScreenLoading />
  }

  if (error || !unlockId) {
    return (
      <ScreenGradientLayout scrollable flexContent tabBarInset={false}>
        <StickyBackHeader onPress={handleBack} topInset={insets.top} />
        <View style={{ padding: space.screenX, paddingTop: 56 }}>
          <StateCard
            emoji="🎁"
            title="Could not load reward"
            message={error ?? 'This reward link is invalid.'}
            primaryAction={{ label: 'Try again', onPress: reload }}
            secondaryAction={{ label: 'Go home', onPress: () => router.replace('/(customer)/home') }}
          />
        </View>
      </ScreenGradientLayout>
    )
  }

  if (!item && !loading) {
    return (
      <ScreenGradientLayout scrollable flexContent tabBarInset={false}>
        <StickyBackHeader onPress={handleBack} topInset={insets.top} />
        <View style={{ padding: space.screenX, paddingTop: 56 }}>
          <StateCard
            emoji="✓"
            title="Already redeemed"
            message="This reward is no longer in your wallet."
            primaryAction={{ label: 'Go home', onPress: () => router.replace('/(customer)/home') }}
          />
        </View>
      </ScreenGradientLayout>
    )
  }

  if (!item) {
    return null
  }

  const venueName = item.customer.venue?.name ?? 'Venue'
  const stickyBack = <StickyBackHeader onPress={handleBack} topInset={insets.top} />

  return (
    <ScreenGradientLayout scrollable={false} flexContent tabBarInset={false} fixedHeader={stickyBack} paddingTop={0}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: space.screenX,
          paddingTop: insets.top + 44,
          justifyContent: 'flex-start',
        }}
      >
        <Text style={withAppFont({ fontSize: 13, fontWeight: '600', color: colors.inkMuted, marginBottom: 10 })}>
          Show at the counter
        </Text>

        <RedeemPassCard
          title={item.reward.title}
          venueName={venueName}
          imageUri={rewardImageUrl(item.reward)}
          logoUri={venueLogoUrl(item.customer.venue ?? undefined)}
        />

        {redeemed ? <RedeemSuccessCard /> : null}
      </View>

      {!redeemed ? (
        <View
          style={{
            paddingHorizontal: space.screenX,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            gap: 8,
          }}
        >
          <Text style={withAppFont({ fontSize: 13, fontWeight: '600', color: colors.inkMuted, textAlign: 'center' })}>
            Slide to confirm redemption
          </Text>
          {redeemError ? (
            <Text style={withAppFont({ color: colors.danger, fontWeight: '600', textAlign: 'center', fontSize: 13 })}>
              {redeemError}
            </Text>
          ) : null}
          <SlideToRedeem
            disabled={!token}
            onRedeem={async () => {
              if (!token) {
                throw new Error('Sign in required')
              }

              setRedeemError('')
              await redeemUnlock(item.unlock_id, token)
              invalidateCustomerRewardCaches(token)
              setRedeemed(true)
              void hapticSuccess()
            }}
          />
        </View>
      ) : null}
    </ScreenGradientLayout>
  )
}
