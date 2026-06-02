import { Link, useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native'

import CoverImage from '../src/components/ui/CoverImage'
import GradientCard from '../src/components/ui/GradientCard'
import GradientOutlineButton from '../src/components/ui/GradientOutlineButton'
import ScreenGradientLayout, { ScreenGradientLoading } from '../src/components/ui/ScreenGradientLayout'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import StateCard from '../src/components/ui/StateCard'
import { apiRequest } from '../src/lib/api'
import { hapticSuccess } from '../src/lib/haptics'
import { venueCoverUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import type { WalletCard } from '../src/types/loyalty'

interface DiscoverVenue {
  id: number
  name: string
  slug: string
  cover_image?: string | null
  cover_image_thumb?: string | null
  category?: string | null
  joined_count?: number
  rewards_count?: number
}

export default function VenuesScreen() {
  const router = useRouter()
  const { token, role } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null)
  const [venues, setVenues] = useState<DiscoverVenue[]>([])
  const [cardsByVenue, setCardsByVenue] = useState<Record<number, WalletCard>>({})
  const [search, setSearch] = useState('')
  const fade = useRef(new Animated.Value(0)).current

  async function load(isRefresh = false) {
    if (!token) return
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError('')
    try {
      const [discoverResponse, cardsResponse] = await Promise.all([
        apiRequest<{ venues: DiscoverVenue[] }>('/venues/discover', { token }),
        apiRequest<{ cards: WalletCard[] }>('/customer/cards', { token }).catch(() => ({ cards: [] })),
      ])
      setVenues(discoverResponse.venues)
      const map: Record<number, WalletCard> = {}
      for (const card of cardsResponse.cards) {
        map[card.venue_id] = card
      }
      setCardsByVenue(map)
    } catch {
      setError('Could not load venues.')
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [token]),
  )

  useEffect(() => {
    if (loading) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 280, useNativeDriver: true }).start()
  }, [fade, loading])

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
    try {
      await apiRequest(`/venues/${slug}/join`, { method: 'POST', token })
      hapticSuccess()
      await load()
    } catch {
      setError('Could not join venue.')
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

  if (loading) {
    return (
      <ScreenGradientLoading>
        <ScreenSkeleton topInset={0} withSearch cardCount={3} />
      </ScreenGradientLoading>
    )
  }

  return (
    <ScreenGradientLayout
      scrollable
      tabBarInset
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
    >
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

      {error ? (
        <View style={{ marginTop: space.headerBottom, paddingHorizontal: space.screenX }}>
          <StateCard
            emoji="⚠️"
            title="Could not load venues"
            message="Check your connection and try again."
            primaryAction={{ label: 'Try again', onPress: () => void load(true) }}
            secondaryAction={{ label: 'Open wallet', onPress: () => router.push('/(customer)/wallet') }}
          />
        </View>
      ) : null}

        <Animated.View
          style={{
            opacity: fade,
            marginTop: error ? space.sectionGap : space.headerBottom,
            paddingHorizontal: space.screenX,
          }}
        >
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
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{item.name}</Text>
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
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.success }}>Joined</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={{ ...typography.body, marginTop: 10, color: colors.plum, fontWeight: '600' }}>{offer}</Text>
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
    </ScreenGradientLayout>
  )
}
