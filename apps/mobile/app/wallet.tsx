import { Link } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ProgressBar from '../src/components/customer/ProgressBar'
import { apiRequest } from '../src/lib/api'
import { venueCoverUrl, venueLogoUrl } from '../src/lib/media'
import { useAuth } from '../src/providers/AuthProvider'
import { colors, radius, space, type as typography } from '../src/theme'
import type { WalletCard } from '../src/types/loyalty'

export default function WalletScreen() {
  const insets = useSafeAreaInsets()
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cards, setCards] = useState<WalletCard[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const fade = useRef(new Animated.Value(0)).current

  async function load(isRefresh = false) {
    if (!token) return
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const response = await apiRequest<{ cards: WalletCard[] }>('/customer/cards', { token })
      setCards(response.cards)
      setError('')
    } catch {
      setError('Could not load your wallet.')
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void load()
  }, [token])

  useEffect(() => {
    if (loading) return
    fade.setValue(0)
    Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }).start()
  }, [fade, loading])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: space.screenX }}>
        <Text style={typography.hero}>Wallet</Text>
        <Text style={{ ...typography.body, marginTop: 4 }}>Your loyalty cards at joined venues.</Text>
        {error ? <Text style={{ color: colors.danger, marginTop: 10 }}>{error}</Text> : null}
        {cards.length > 0 ? (
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search venues"
            placeholderTextColor={colors.inkSoft}
            style={{
              marginTop: 14,
              backgroundColor: colors.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: colors.ink,
              fontSize: 15,
            }}
          />
        ) : null}
      </View>

      {cards.length === 0 ? (
        <Animated.View
          style={{
            flex: 1,
            opacity: fade,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: space.screenX,
          }}
        >
          <Text style={{ fontSize: 56 }}>💳</Text>
          <Text style={{ ...typography.section, marginTop: 16, textAlign: 'center' }}>No cards yet</Text>
          <Text style={{ ...typography.body, marginTop: 8, textAlign: 'center' }}>
            Discover venues and start collecting stamps.
          </Text>
          <Link href="/(customer)/venues" asChild>
            <Pressable
              style={{
                marginTop: 24,
                backgroundColor: colors.primary,
                borderRadius: radius.button,
                paddingVertical: 14,
                paddingHorizontal: 28,
              }}
            >
              <Text style={{ color: colors.primaryText, fontWeight: '800', fontSize: 16 }}>Browse venues</Text>
            </Pressable>
          </Link>
        </Animated.View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fade, marginTop: 18 }}>
          <FlatList
            contentContainerStyle={{ paddingHorizontal: space.screenX, paddingBottom: insets.bottom + 18, gap: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
            data={cards.filter((item) => {
              const query = search.trim().toLowerCase()
              if (!query) return true
              return (item.venue?.name ?? '').toLowerCase().includes(query)
            })}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const summary = item.summary
              const max = summary?.max_stamps ?? 10
              const stamps = summary?.stamps ?? item.stamps
              const toNext = summary?.stamps_to_next ?? Math.max(max - stamps, 0)
              const nextTitle = summary?.next_reward_title ?? 'your reward'
              const cover = venueCoverUrl(item.venue ?? undefined)
              const logo = venueLogoUrl(item.venue ?? undefined)

              return (
                <Link
                  href={{
                    pathname: '/card/[cardId]',
                    params: { cardId: String(item.id), venueId: String(item.venue_id) },
                  }}
                  asChild
                >
                  <Pressable
                    style={{
                      backgroundColor: colors.lavender,
                      borderRadius: radius.card,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: colors.lavenderBorder,
                    }}
                  >
                    {cover ? (
                      <Image source={{ uri: cover }} style={{ width: '100%', height: 122 }} resizeMode="cover" />
                    ) : (
                      <View style={{ height: 122, backgroundColor: colors.surfaceMuted }} />
                    )}
                    <View style={{ padding: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: cover ? -24 : 0 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: colors.lavender,
                            borderWidth: 2,
                            borderColor: colors.surface,
                            overflow: 'hidden',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {logo ? (
                            <Image source={{ uri: logo }} style={{ width: 44, height: 44 }} />
                          ) : (
                            <Text style={{ fontSize: 20 }}>☕</Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.plum, flex: 1 }}>
                          {item.venue?.name ?? 'Venue'}
                        </Text>
                      </View>
                      <View style={{ marginTop: 12 }}>
                        <ProgressBar value={stamps} max={max} />
                      </View>
                      <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '700', color: colors.ink }}>
                        {stamps} / {max} stamps
                      </Text>
                      <Text style={{ ...typography.caption, marginTop: 4 }}>
                        {toNext > 0 ? `${nextTitle} in ${toNext} stamp${toNext === 1 ? '' : 's'}` : `${nextTitle} ready`}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              )
            }}
          />
        </Animated.View>
      )}
    </View>
  )
}
