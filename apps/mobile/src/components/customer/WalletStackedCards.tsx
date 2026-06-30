import { RefreshControl, ScrollView, View } from 'react-native'
import { useTranslation } from 'react-i18next'

import WalletHeroCard from './WalletHeroCard'
import StateCard from '../ui/StateCard'
import { colors, space, walletCard } from '../../theme'
import type { WalletCard } from '../../types/loyalty'

interface WalletStackedCardsProps {
  cards: WalletCard[]
  refreshing: boolean
  onRefresh: () => void
  bottomInset: number
  emptySearch?: boolean
  onClearSearch?: () => void
}

export default function WalletStackedCards({
  cards,
  refreshing,
  onRefresh,
  bottomInset,
  emptySearch,
  onClearSearch,
}: WalletStackedCardsProps) {
  const { t } = useTranslation()

  if (emptySearch) {
    return (
      <View style={{ paddingHorizontal: space.screenX, paddingTop: space.sectionGap }}>
        <StateCard
          emoji="🔍"
          title={t('wallet.noMatches')}
          message={t('wallet.noMatchesMessage')}
          primaryAction={{ label: t('wallet.clearSearch'), onPress: () => onClearSearch?.() }}
        />
      </View>
    )
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{
        paddingHorizontal: space.screenX,
        paddingBottom: bottomInset + 24,
        paddingTop: 4,
        gap: walletCard.gap,
      }}
    >
      {cards.map((item) => (
        <WalletHeroCard key={item.id} item={item} />
      ))}
    </ScrollView>
  )
}
