import { Link } from 'expo-router'
import { Image, Text, View } from 'react-native'

import WalletStampDashes from './WalletStampDashes'
import PressableCard from '../ui/PressableCard'
import { formatVenueCategoryLabel } from '../../lib/format'
import { venueCoverUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { colors, walletCard } from '../../theme'
import type { WalletCard } from '../../types/loyalty'

interface WalletHeroCardProps {
  item: WalletCard
}

export default function WalletHeroCard({ item }: WalletHeroCardProps) {
  const summary = item.summary
  const max = Math.max(summary?.max_stamps ?? 10, 1)
  const stamps = Math.min(summary?.stamps ?? item.stamps, max)
  const toNext = summary?.stamps_to_next ?? Math.max(max - stamps, 0)
  const cover = venueCoverUrl(item.venue ?? undefined)
  const categoryLabel = formatVenueCategoryLabel(item.venue?.category)

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
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(5, 13, 30, 0.72)',
            }}
          />

          <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
            <View>
              <Text
                style={withAppFont({
                  fontSize: 26,
                  fontWeight: '800',
                  color: colors.primaryText,
                  letterSpacing: -0.5,
                })}
                numberOfLines={1}
              >
                {item.venue?.name ?? 'Venue'}
              </Text>
              <Text
                style={withAppFont({
                  marginTop: 4,
                  fontSize: 14,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.82)',
                })}
              >
                {categoryLabel}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={withAppFont({
                    fontSize: 15,
                    fontWeight: '700',
                    color: 'rgba(255,255,255,0.9)',
                  })}
                >
                  <Text style={{ fontSize: 22, fontWeight: '800', color: colors.accent }}>{stamps}</Text>
                  {` / ${max} stamps`}
                </Text>
                <WalletStampDashes filled={stamps} total={max} />
              </View>
              <View style={{ alignItems: 'flex-end', minWidth: 88, marginBottom: 12 }}>
                <Text
                  style={withAppFont({
                    fontSize: 40,
                    fontWeight: '800',
                    color: colors.accent,
                    lineHeight: 42,
                  })}
                >
                  {toNext}
                </Text>
                <Text
                  style={withAppFont({
                    fontSize: 13,
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.75)',
                    textAlign: 'right',
                  })}
                >
                  {toNext === 1 ? 'stamp to go' : 'stamps to go'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </PressableCard>
    </Link>
  )
}
