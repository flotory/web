import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import RedeemPassCard from '../../src/components/customer/RedeemPassCard'
import RedeemStepsGuide from '../../src/components/customer/RedeemStepsGuide'
import RedeemVenueInfo from '../../src/components/customer/RedeemVenueInfo'
import SlideToRedeem from '../../src/components/customer/SlideToRedeem'
import { CustomerScreenLoading } from '../../src/components/ui/CustomerScreen'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
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
import { colors, radius, space, type as typography } from '../../src/theme'

function RedeemSuccessHero({ title, venueName }: { title: string; venueName: string }) {
  const { t } = useTranslation()

  return (
    <LinearGradient
      colors={['#071225', colors.primary, '#0c1a30']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: radius.card,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(215, 163, 93, 0.28)',
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons name="checkmark" size={40} color={colors.primary} />
      </View>
      <Text style={withAppFont({ fontSize: 13, fontWeight: '800', letterSpacing: 0.8, color: colors.accent })}>
        {t('redeem.redeemedBadge')}
      </Text>
      <Text
        style={withAppFont({
          marginTop: 8,
          fontSize: 26,
          fontWeight: '800',
          color: colors.primaryText,
          textAlign: 'center',
          letterSpacing: -0.4,
        })}
      >
        {t('redeem.enjoyReward')}
      </Text>
      <Text
        style={withAppFont({
          marginTop: 10,
          fontSize: 15,
          lineHeight: 22,
          color: 'rgba(255,255,255,0.78)',
          textAlign: 'center',
        })}
      >
        {t('redeem.redeemedMessage', { title, venueName })}
      </Text>
    </LinearGradient>
  )
}

export default function RedeemRewardScreen() {
  const { t } = useTranslation()
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
            title={t('redeem.loadErrorTitle')}
            message={error ?? t('redeem.invalidLink')}
            primaryAction={{ label: t('venues.tryAgain'), onPress: reload }}
            secondaryAction={{ label: t('redeem.goHome'), onPress: () => router.replace('/(customer)/home') }}
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
            title={t('redeem.alreadyRedeemedTitle')}
            message={t('redeem.alreadyRedeemedMessage')}
            primaryAction={{ label: t('redeem.goHome'), onPress: () => router.replace('/(customer)/home') }}
          />
        </View>
      </ScreenGradientLayout>
    )
  }

  if (!item) {
    return null
  }

  const venue = item.customer.venue
  const venueName = venue?.name ?? t('common.venue')
  const stickyBack = <StickyBackHeader onPress={handleBack} topInset={insets.top} />

  return (
    <>
      {/* Disable the iOS left-edge swipe-back on this screen: it starts in the
          same zone as the slide-to-redeem thumb and steals the gesture, so the
          slide reads as "go back". Users go back via the sticky header button. */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <ScreenGradientLayout
        scrollable={false}
        flexContent
        tabBarInset={false}
        fixedHeader={stickyBack}
        paddingTop={0}
      >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: space.screenX,
            paddingTop: 0,
            paddingBottom: space.sectionY,
            gap: space.sectionGap,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={typography.label}>{t('redeem.redeem')}</Text>
            <Text style={{ ...typography.hero, marginTop: 6, fontSize: 30, lineHeight: 36 }}>
              {redeemed ? t('redeem.allSet') : t('redeem.yourReward')}
            </Text>
            <Text style={{ ...typography.body, marginTop: 8, fontSize: 15 }}>
              {redeemed
                ? t('redeem.confirmedMessage')
                : t('redeem.instructions')}
            </Text>
          </View>

          {redeemed ? (
            <>
              <RedeemSuccessHero title={item.reward.title} venueName={venueName} />
              <PrimaryButton label={t('redeem.backToHome')} onPress={() => router.replace('/(customer)/home')} icon="home-outline" />
            </>
          ) : (
            <>
              <RedeemPassCard
                title={item.reward.title}
                venueName={venueName}
                imageUri={rewardImageUrl(item.reward)}
                logoUri={venueLogoUrl(venue ?? undefined)}
                requiredStamps={item.reward.required_stamps}
                description={item.reward.description}
              />

              <RedeemStepsGuide />

              <RedeemVenueInfo
                venueName={venueName}
                address={venue?.address}
                mapTarget={{
                  latitude: venue?.latitude,
                  longitude: venue?.longitude,
                  address: venue?.address,
                  label: venueName,
                }}
              />
            </>
          )}
        </ScrollView>

        {!redeemed ? (
          <View
            style={{
              paddingHorizontal: space.screenX,
              paddingTop: 14,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              gap: 10,
            }}
          >
            <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.inkMuted, textAlign: 'center' })}>
              {t('redeem.counterHint')}
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
                  throw new Error(t('redeem.signInRequired'))
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
      </View>
      </ScreenGradientLayout>
    </>
  )
}
