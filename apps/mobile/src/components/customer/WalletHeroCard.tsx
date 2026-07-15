import { Link } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Image, Text, View } from 'react-native'

import WalletMilestoneSlots from './WalletMilestoneSlots'
import PressableCard from '../ui/PressableCard'
import { venueCoverUrl } from '../../lib/media'
import { walletMilestoneProgress } from '../../lib/walletMilestoneProgress'
import { withAppFont } from '../../lib/typography'
import { colors, walletCard } from '../../theme'
import type { WalletCard } from '../../types/loyalty'

const walletProgressScrimHeight = 96

interface WalletHeroCardProps {
  item: WalletCard
}

export default function WalletHeroCard({ item }: WalletHeroCardProps) {
  const progress = walletMilestoneProgress(item.summary, item.stamps)
  const cover = venueCoverUrl(item.venue ?? undefined)

  return (
    <Link
      href={{
        pathname: '/card/[cardId]',
        params: { cardId: String(item.id), venueId: String(item.venue_id) },
      }}
      asChild
    >
      <PressableCard style={{ borderRadius: walletCard.radius }}>
        <View
          style={{
            height: walletCard.height,
            borderRadius: walletCard.radius,
            overflow: 'hidden',
            backgroundColor: colors.primary,
          }}
        >
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={{ position: 'absolute', width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}

          <LinearGradient
            colors={['transparent', 'rgba(5, 13, 30, 0.82)']}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: walletProgressScrimHeight,
            }}
          />

          <View style={{ flex: 1, padding: 14, justifyContent: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text
                  style={withAppFont({
                    fontSize: 14,
                    fontWeight: '700',
                    color: colors.primaryText,
                  })}
                >
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.accent }}>
                    {progress.current}
                  </Text>
                  {` / ${progress.target} stamps`}
                </Text>
                <WalletMilestoneSlots filled={progress.current} milestoneStamp={progress.milestoneStamp} />
              </View>
              <View style={{ alignItems: 'flex-end', minWidth: 72, marginBottom: 8 }}>
                <Text
                  style={withAppFont({
                    fontSize: 32,
                    fontWeight: '800',
                    color: colors.accent,
                    lineHeight: 34,
                  })}
                >
                  {progress.toNext}
                </Text>
                <Text
                  style={withAppFont({
                    fontSize: 12,
                    fontWeight: '600',
                    color: colors.primaryText,
                    textAlign: 'right',
                  })}
                >
                  {progress.toNext === 1 ? 'stamp to go' : 'stamps to go'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </PressableCard>
    </Link>
  )
}
