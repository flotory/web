import * as Linking from 'expo-linking'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import VenueScanRewardHeroCard from '../../src/components/customer/VenueScanRewardHeroCard'
import VenueScanQuickFacts from '../../src/components/customer/VenueScanQuickFacts'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout, { ScreenGradientLoading } from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import StateCard from '../../src/components/ui/StateCard'
import { ApiError, apiRequest } from '../../src/lib/api'
import { webAppOrigin } from '../../src/lib/config'
import { venueLogoUrl } from '../../src/lib/media'
import type { VenueHeroReward, VenueSocialProof } from '../../src/lib/venueScanLanding'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, space } from '../../src/theme'
import { withAppFont } from '../../src/lib/typography'

interface LandingPayload {
  venue: {
    id: number
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
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { token, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [landing, setLanding] = useState<LandingPayload | null>(null)

  useEffect(() => {
    async function load() {
      if (!slug) return
      setLoading(true)
      setError('')
      try {
        const response = await apiRequest<LandingPayload>(`/public/venues/${encodeURIComponent(slug)}/landing`)
        setLanding(response)
      } catch {
        setError('Venue link unavailable.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [slug])

  function handleBack() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/(customer)/venues')
  }

  async function handlePrimary() {
    if (!slug) return

    if (!token) {
      await Linking.openURL(`${webAppOrigin()}/v/${encodeURIComponent(slug)}`)
      return
    }

    if (role === 'staff') {
      setError('Staff accounts cannot join customer loyalty cards.')
      return
    }

    setJoining(true)
    setError('')
    try {
      await apiRequest(`/venues/${encodeURIComponent(slug)}/join`, { method: 'POST', token })
      router.replace('/(customer)/wallet')
    } catch (exception) {
      setError(exception instanceof ApiError ? exception.message : 'Could not join venue.')
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
              title="Venue not found"
              message={error}
              primaryAction={{ label: 'Browse venues', onPress: () => router.replace('/(customer)/venues') }}
            />
          </View>
        </View>
      </ScreenGradientLayout>
    )
  }

  const venue = landing?.venue
  const logo = venue ? venueLogoUrl(venue) : null

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
              {venue?.name ?? 'Venue'}
            </Text>
          </View>

          <View style={{ marginTop: space.sectionGap }}>
            <VenueScanRewardHeroCard venueName={venue?.name ?? 'Venue'} category={venue?.category} hero={landing?.hero_reward} />
          </View>

          <View style={{ marginTop: space.sectionGap }}>
            <VenueScanQuickFacts
              firstRewardStamps={landing?.hero_reward?.required_stamps}
              milestoneCount={landing?.milestones.length ?? 0}
            />
          </View>

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
          label={joining ? 'Joining…' : 'Start collecting rewards'}
          onPress={() => void handlePrimary()}
          disabled={joining}
        />
      </View>
    </View>
  )
}
