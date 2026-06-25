import { Ionicons } from '@expo/vector-icons'
import { Redirect, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Animated, Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import WalletStackedCards from '../src/components/customer/WalletStackedCards'
import CustomerScreen, { CustomerScreenLoading } from '../src/components/ui/CustomerScreen'
import ScreenSkeleton from '../src/components/ui/ScreenSkeleton'
import StateCard from '../src/components/ui/StateCard'
import { useCustomerCards } from '../src/hooks/useCustomerCards'
import { useAuth } from '../src/providers/AuthProvider'
import { useCustomerSurfaceRefresh } from '../src/hooks/useCustomerSurfaceRefresh'
import { useFadeOnReady } from '../src/hooks/useFadeOnReady'
import { withAppFont } from '../src/lib/typography'
import { colors, radius, space, tabBar } from '../src/theme'

export default function WalletScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { token, booting } = useAuth()
  const [search, setSearch] = useState('')
  const { data: cards, loading, refreshing, error, refresh, reload, silentRefresh } = useCustomerCards()
  useCustomerSurfaceRefresh(() => {
    void silentRefresh()
  })
  const fade = useFadeOnReady(!loading)

  const cardList = cards ?? []

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return cardList
    return cardList.filter((item) => (item.venue?.name ?? '').toLowerCase().includes(query))
  }, [cardList, search])

  if (!booting && !token) {
    return <Redirect href="/(customer)/venues" />
  }

  if (loading) {
    return (
      <CustomerScreenLoading skeleton={<ScreenSkeleton topInset={0} withSearch cardCount={3} />} />
    )
  }

  const header = (
    <View style={{ paddingHorizontal: space.screenX }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={withAppFont({ fontSize: 34, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 })}>
          Wallet
        </Text>
        <Pressable
          onPress={() => router.push('/(customer)/venues')}
          accessibilityRole="button"
          accessibilityLabel="Discover venues"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={22} color={colors.primaryText} />
        </Pressable>
      </View>
      {cardList.length > 0 ? (
        <View
          style={{
            marginTop: space.sectionGap,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radius.image,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 14,
          }}
        >
          <Ionicons name="search" size={18} color={colors.inkSoft} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search venues"
            placeholderTextColor={colors.inkSoft}
            style={{
              flex: 1,
              marginLeft: 8,
              paddingVertical: 12,
              color: colors.ink,
              fontSize: 15,
            }}
          />
        </View>
      ) : null}
    </View>
  )

  return (
    <CustomerScreen
      loading={false}
      flexContent
      tabBarInset
      header={header}
      error={error}
      errorState={
        error
          ? {
              title: 'Could not load wallet',
              message: 'Check your connection and try again.',
              primaryLabel: 'Try again',
              onPrimary: reload,
              secondaryLabel: 'Browse venues',
              onSecondary: () => router.push('/(customer)/venues'),
            }
          : undefined
      }
    >
      {!error && cardList.length === 0 ? (
        <Animated.View style={{ flex: 1, opacity: fade, justifyContent: 'center', paddingHorizontal: space.screenX }}>
          <StateCard
            icon="ticket-outline"
            title="No stamp cards yet"
            message="Discover venues nearby and start collecting stamps toward your first reward."
            primaryAction={{ label: 'Browse venues', onPress: () => router.push('/(customer)/venues') }}
          />
        </Animated.View>
      ) : !error ? (
        <Animated.View style={{ flex: 1, opacity: fade, marginTop: space.headerBottom }}>
          <WalletStackedCards
            cards={filtered}
            refreshing={refreshing}
            onRefresh={refresh}
            bottomInset={insets.bottom + tabBar.height + tabBar.scrollBottomPad}
            emptySearch={filtered.length === 0 && cardList.length > 0}
            onClearSearch={() => setSearch('')}
          />
        </Animated.View>
      ) : null}
    </CustomerScreen>
  )
}
