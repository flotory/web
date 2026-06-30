import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Image, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import VenueScanRewardHeroCard from '../../src/components/customer/VenueScanRewardHeroCard'
import VenueScanQuickFacts from '../../src/components/customer/VenueScanQuickFacts'
import FirstJoinNfcEducation from '../../src/components/customer/FirstJoinNfcEducation'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout, { ScreenGradientLoading } from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import StateCard from '../../src/components/ui/StateCard'
import { ApiError, apiRequest } from '../../src/lib/api'
import { fetchCustomerCards, findWalletCardForLoyaltyVenue } from '../../src/lib/customerData'
import { venueLogoUrl } from '../../src/lib/media'
import { membershipFromWalletCard, type VenueHeroReward, type VenueSocialProof } from '../../src/lib/venueScanLanding'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, space } from '../../src/theme'
import { withAppFont } from '../../src/lib/typography'
import type { WalletCard } from '../../src/types/loyalty'

interface LandingPayload {
  venue: {
    id: number
    loyalty_venue_id?: number
    name: string
    slug: string
    category?: string | null
    logo?: string | null
    logo_thumb?: string | null
  }
  milestones: Array<{
    id: number
    title: string
    required_stamps: number
  }>
  hero_reward?: VenueHeroReward | null
  social_proof?: VenueSocialProof | null
}

export default function VenueJoinScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { token, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [joinedCustomerId, setJoinedCustomerId] = useState<number | null>(null)
  const [landing, setLanding] = useState<LandingPayload | null>(null)
  const [existingCard, setExistingCard] = useState<WalletCard | null>(null)

  useEffect(() => {
    async function load() {
      if (!slug) return
      setLoading(true)
      setError('')
      setExistingCard(null)

      try {
        const landingResponse = await apiRequest<LandingPayload>(`/public/venues/${encodeURIComponent(slug)}/landing`)
        setLanding(landingResponse)

        if (token && role === 'customer') {
          const cards = await fetchCustomerCards(token, true)
          const loyaltyVenueId = landingResponse.venue.loyalty_venue_id ?? landingResponse.venue.id
          setExistingCard(findWalletCardForLoyaltyVenue(cards, loyaltyVenueId) ?? null)
        }
      } catch {
        setError(t('join.unavailable'))
        setLanding(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [slug, token, role, t])

  const membership = useMemo(
    () => (existingCard ? membershipFromWalletCard(existingCard) : null),
    [existingCard],
  )

  const isMember = membership != null

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/(customer)/venues')
  }

  function openExistingCard() {
    if (!existingCard) {
      router.replace('/(customer)/wallet')
      return
    }

    router.replace({
      pathname: '/card/[cardId]',
      params: { cardId: String(existingCard.id), venueId: String(existingCard.venue_id) },
    })
  }

  function openJoinedCard(customerId: number) {
    const loyaltyVenueId = landing?.venue.loyalty_venue_id ?? landing?.venue.id
    if (!loyaltyVenueId) {
      router.replace('/(customer)/wallet')
      return
    }

    router.replace({
      pathname: '/card/[cardId]',
      params: { cardId: String(customerId), venueId: String(loyaltyVenueId) },
    })
  }

  async function handlePrimary() {
    if (!slug) return

    if (isMember) {
      openExistingCard()
      return
    }

    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(`/v/${slug}`)}`)
      return
    }

    if (role === 'owner') {
      setError(t('join.ownerCannotJoin'))
      return
    }

    setJoining(true)
    setError('')
    try {
      const response = await apiRequest<{ customer: { id: number }; joined?: boolean }>(
        `/venues/${encodeURIComponent(slug)}/join`,
        { method: 'POST', token },
      )

      if (response.joined === false) {
        openExistingCard()
        return
      }

      setJoinedCustomerId(response.customer.id)
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : t('join.couldNotJoin'))
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <ScreenGradientLoading>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.ink} />
        </View>
      </ScreenGradientLoading>
    )
  }

  const stickyBack = <StickyBackHeader onPress={handleBack} topInset={insets.top} />

  if (!landing && error) {
    return (
      <ScreenGradientLayout scrollable tabBarInset={false} paddingTop={0} fixedHeader={stickyBack}>
        <View style={{ paddingHorizontal: space.screenX }}>
          <View style={{ marginTop: space.sectionY }}>
            <StateCard
              emoji="🔗"
              title={t('join.notFoundTitle')}
              message={error}
              primaryAction={{ label: t('wallet.browseVenues'), onPress: () => router.replace('/(customer)/venues') }}
            />
          </View>
        </View>
      </ScreenGradientLayout>
    )
  }

  const venue = landing?.venue
  const logo = venue ? venueLogoUrl(venue) : null
  const showJoinSuccess = joinedCustomerId != null
  const primaryLabel = isMember
    ? t('join.openCard')
    : showJoinSuccess
      ? t('join.viewStampCard')
      : joining
        ? t('join.joining')
        : t('join.startCollecting')

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenGradientLayout
        scrollable
        tabBarInset={false}
        paddingTop={0}
        fixedHeader={stickyBack}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, flexGrow: 1 }}
      >
        <View style={{ flex: 1, paddingHorizontal: space.screenX }}>
          <View style={{ alignItems: 'center', marginTop: space.sectionY }}>
            {logo ? (
              <Image
                source={{ uri: logo }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 22,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            )}
            <Text style={withAppFont({ marginTop: 14, fontSize: 24, fontWeight: '800', color: colors.ink, textAlign: 'center' })}>
              {venue?.name ?? t('common.venue')}
            </Text>
            {isMember ? (
              <Text style={withAppFont({ marginTop: 8, fontSize: 14, fontWeight: '700', color: colors.accent, textAlign: 'center' })}>
                {t('join.alreadyMember')}
              </Text>
            ) : null}
          </View>

          <View style={{ marginTop: space.sectionGap }}>
            <VenueScanRewardHeroCard
              venueName={venue?.name ?? t('common.venue')}
              category={venue?.category}
              hero={landing?.hero_reward}
              membership={membership}
            />
          </View>

          <View style={{ marginTop: space.sectionGap }}>
            <VenueScanQuickFacts
              firstRewardStamps={landing?.hero_reward?.required_stamps}
              milestoneCount={landing?.milestones.length ?? 0}
              membership={membership}
            />
          </View>

          {showJoinSuccess ? (
            <View style={{ marginTop: space.sectionGap }}>
              <FirstJoinNfcEducation variant="qr_join" />
            </View>
          ) : null}

          {error ? (
            <Text style={withAppFont({ marginTop: 12, fontSize: 14, color: colors.danger, textAlign: 'center' })}>{error}</Text>
          ) : null}
        </View>
      </ScreenGradientLayout>

      <View
        style={{
          paddingHorizontal: space.screenX,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.bg,
        }}
      >
        <PrimaryButton
          label={primaryLabel}
          onPress={() => {
            if (showJoinSuccess && joinedCustomerId != null) {
              openJoinedCard(joinedCustomerId)
              return
            }

            void handlePrimary()
          }}
          disabled={joining}
        />
        {isMember ? (
          <Text style={withAppFont({ marginTop: 10, fontSize: 12, lineHeight: 18, color: colors.inkMuted, textAlign: 'center' })}>
            {t('join.memberHint')}
          </Text>
        ) : null}
      </View>
    </View>
  )
}
