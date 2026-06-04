import { Link, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Animated, Pressable, Text, TextInput, View } from 'react-native'

import CoverImage from '../src/components/ui/CoverImage'
import CustomerScreen from '../src/components/ui/CustomerScreen'
import GradientCard from '../src/components/ui/GradientCard'
import GradientOutlineButton from '../src/components/ui/GradientOutlineButton'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import StateCard from '../src/components/ui/StateCard'
import { useDiscoverVenues } from '../src/hooks/useDiscoverVenues'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import { joinVenueBySlug } from '../src/lib/customerData'
import { hapticSuccess } from '../src/lib/haptics'
import { venueCoverUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import { withAppFont } from '../src/lib/typography'

export default function VenuesScreen() {
  const router = useRouter()
  const { token, role } = useAuth()
  const { data, loading, refreshing, error, refresh, reload } = useDiscoverVenues()
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null)
  const [joinError, setJoinError] = useState('')
  const [search, setSearch] = useState('')
  const fade = useFadeOnReady(!loading)

  const venues = data?.venues ?? []
  const cardsByVenue = data?.cardsByVenue ?? {}

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return venues
    return venues.filter((venue) => {
      const haystack = [venue.name, venue.category, venue.slug].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [search, venues])

  async function joinVenue(slug: string) {
    if (!token) return
    setJoiningSlug(slug)
    setJoinError('')
    try {
      await joinVenueBySlug(token, slug)
      hapticSuccess()
      await reload()
    } catch {
      setJoinError('Could not join venue.')
    } finally {
      setJoiningSlug(null)
    }
  }

  if (role !== 'customer') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: space.screenX, backgroundColor: colors.bg }}>
        <Text style={typography.section}>Customer venues only</Text>
      </View>
    )
  }

  const header = (
    <View style={{ paddingHorizontal: space.screenX }}>
      <ScreenHeader title="Discover" subtitle="Find your next favorite reward spot." />
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search venues"
        placeholderTextColor={colors.inkSoft}
        style={{
          marginTop: space.sectionGap,
          backgroundColor: colors.surface,
          borderRadius: radius.image,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
          color: colors.ink,
        }}
      />
    </View>
  )

  return (
    <CustomerScreen
      loading={loading}
      error={error}
      scrollable
      tabBarInset
      refreshing={refreshing}
      onRefresh={refresh}
      header={header}
      skeleton={<ScreenSkeleton topInset={0} withSearch cardCount={3} />}
      errorState={
        error
          ? {
              title: 'Could not load venues',
              message: 'Check your connection and try again.',
              primaryLabel: 'Try again',
              onPrimary: reload,
              secondaryLabel: 'Open wallet',
              onSecondary: () => router.push('/(customer)/wallet'),
            }
          : undefined
      }
    >
      {!error ? (
        <Animated.View
          style={{
            opacity: fade,
            marginTop: space.headerBottom,
            paddingHorizontal: space.screenX,
          }}
        >
          {joinError ? (
            <View style={{ marginBottom: space.sectionGap }}>
              <StateCard
                emoji="⚠️"
                title="Could not join"
                message={joinError}
                primaryAction={{ label: 'Try again', onPress: () => setJoinError('') }}
              />
            </View>
          ) : null}

          <View style={{ gap: space.listGap }}>
            {filtered.map((item) => {
              const joined = (item.joined_count ?? 0) > 0
              const cover = venueCoverUrl(item)
              const offer =
                (item.rewards_count ?? 0) > 0
                  ? 'Earn visits and unlock your first reward'
                  : 'Join to start earning rewards'

              return (
                <GradientCard key={item.id} header={<CoverImage uri={cover} />}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={withAppFont({ fontSize: 20, fontWeight: '800', color: colors.ink })}>{item.name}</Text>
                      <View style={{ marginTop: 6, flexDirection: 'row', gap: 8 }}>
                        {item.category ? (
                          <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
                            <Text style={{ ...typography.caption, color: colors.primary, textTransform: 'capitalize' }}>
                              {item.category}
                            </Text>
                          </View>
                        ) : null}
                        <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={{ ...typography.caption, color: colors.primary }}>Nearby</Text>
                        </View>
                      </View>
                    </View>
                    {joined ? (
                      <View
                        style={{
                          backgroundColor: colors.successBg,
                          borderRadius: radius.button,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderWidth: 1,
                          borderColor: colors.successBorder,
                        }}
                      >
                        <Text style={withAppFont({ fontSize: 12, fontWeight: '700', color: colors.success })}>Joined</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={withAppFont({ ...typography.body, marginTop: 10, color: colors.plum, fontWeight: '600' })}>{offer}</Text>
                  {joined ? (
                    <Link
                      href={
                        cardsByVenue[item.id]
                          ? {
                              pathname: '/card/[cardId]',
                              params: {
                                cardId: String(cardsByVenue[item.id].id),
                                venueId: String(item.id),
                              },
                            }
                          : '/(customer)/wallet'
                      }
                      asChild
                    >
                      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.97 : 1 })}>
                        <GradientOutlineButton label="Continue collecting" />
                      </Pressable>
                    </Link>
                  ) : (
                    <Pressable
                      onPress={() => void joinVenue(item.slug)}
                      disabled={joiningSlug === item.slug}
                      style={({ pressed }) => ({ opacity: pressed || joiningSlug === item.slug ? 0.97 : 1 })}
                    >
                      <GradientOutlineButton
                        label={joiningSlug === item.slug ? 'Joining…' : 'Join venue'}
                        style={joiningSlug === item.slug ? { opacity: 0.65 } : undefined}
                      />
                    </Pressable>
                  )}
                </GradientCard>
              )
            })}
          </View>

          {!filtered.length ? (
            <View style={{ marginTop: space.sectionY }}>
              <StateCard
                emoji="🔍"
                title="No venues found"
                message="Try another search term or browse all nearby spots."
                primaryAction={{ label: 'Clear search', onPress: () => setSearch('') }}
              />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
