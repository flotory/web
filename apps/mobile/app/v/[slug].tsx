import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import VenueJoinMilestones from '../../src/components/customer/VenueJoinMilestones'
import PrimaryButton from '../../src/components/ui/PrimaryButton'
import ScreenGradientLayout, { ScreenGradientLoading } from '../../src/components/ui/ScreenGradientLayout'
import { StickyBackHeader } from '../../src/components/ui/StickyBackButton'
import StateCard from '../../src/components/ui/StateCard'
import { ApiError, apiRequest } from '../../src/lib/api'
import { formatVenueCategoryLabel } from '../../src/lib/format'
import { venueCoverUrl } from '../../src/lib/media'
import { hasVenueMapTarget, openVenueInMaps } from '../../src/lib/openMaps'
import { useAuth } from '../../src/providers/AuthProvider'
import { colors, radius, space } from '../../src/theme'
import { withAppFont } from '../../src/lib/typography'

interface LandingPayload {
  venue: {
    id: number
    name: string
    slug: string
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    category?: string | null
    cover_image?: string | null
    cover_image_thumb?: string | null
    logo?: string | null
    logo_thumb?: string | null
  }
  milestones: Array<{
    id: number
    title: string
    required_stamps: number
  }>
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

  async function handleJoin() {
    if (!token || !slug) {
      router.replace('/login')
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

  const cover = venueCoverUrl(landing?.venue)
  const categoryLabel = landing?.venue.category ? formatVenueCategoryLabel(landing.venue.category) : null
  const milestones = landing?.milestones ?? []
  const venue = landing?.venue
  const canOpenMaps = venue ? hasVenueMapTarget(venue) : false

  async function handleDirections() {
    if (!venue || !canOpenMaps) {
      return
    }

    const opened = await openVenueInMaps({
      latitude: venue.latitude,
      longitude: venue.longitude,
      address: venue.address,
      label: venue.name,
    })

    if (!opened) {
      setError('Could not open maps for this venue.')
    }
  }

  return (
    <ScreenGradientLayout
      scrollable
      tabBarInset={false}
      paddingTop={0}
      fixedHeader={stickyBack}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <View style={{ paddingHorizontal: space.screenX }}>
        {cover ? (
          <View
            style={{
              height: 168,
              borderRadius: radius.card,
              overflow: 'hidden',
              backgroundColor: colors.surfaceMuted,
              marginBottom: 16,
            }}
          >
            <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </View>
        ) : null}

        <Text style={withAppFont({ fontSize: 30, fontWeight: '800', color: colors.ink, letterSpacing: -0.6 })}>
          {landing?.venue.name ?? 'Venue'}
        </Text>

        <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {venue?.address ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
              <Ionicons name="location-outline" size={15} color={colors.inkMuted} />
              <Text style={withAppFont({ fontSize: 14, color: colors.inkMuted })}>{venue.address}</Text>
            </View>
          ) : null}
          {categoryLabel ? (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: colors.lavender,
              }}
            >
              <Text style={withAppFont({ fontSize: 12, fontWeight: '600', color: colors.primarySoft })}>
                {categoryLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={withAppFont({
            marginTop: 14,
            fontSize: 15,
            lineHeight: 22,
            color: colors.inkMuted,
          })}
        >
          Join to start a digital loyalty card. Show your QR when you visit — stamps and rewards stay in the app.
        </Text>

        {canOpenMaps ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open directions in maps"
            onPress={() => void handleDirections()}
            style={({ pressed }) => ({
              marginTop: 14,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="map-outline" size={16} color={colors.primarySoft} />
            <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.primarySoft })}>
              Directions
            </Text>
          </Pressable>
        ) : null}

        <View style={{ marginTop: space.sectionGap }}>
          <VenueJoinMilestones milestones={milestones} />
        </View>

        {error ? (
          <Text style={withAppFont({ marginTop: 12, fontSize: 14, color: colors.danger })}>{error}</Text>
        ) : null}

        <PrimaryButton
          label={joining ? 'Joining…' : token ? 'Join venue' : 'Log in to join'}
          onPress={() => void handleJoin()}
          disabled={joining}
          style={{ marginTop: space.sectionGap }}
        />

        {!token ? (
          <Text style={withAppFont({ marginTop: 10, fontSize: 13, textAlign: 'center', color: colors.inkSoft })}>
            You need a customer account to collect stamps here.
          </Text>
        ) : null}
      </View>
    </ScreenGradientLayout>
  )
}
