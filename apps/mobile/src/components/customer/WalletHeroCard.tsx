import { Link } from 'expo-router'
import { Image, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import WalletStampDashes from './WalletStampDashes'
import PressableCard from '../ui/PressableCard'
import { formatVenueCategoryLabel } from '../../lib/format'
import { venueCoverUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { walletCard } from '../../theme'
import type { WalletCard } from '../../types/loyalty'

const OVERLAY_BY_CATEGORY: Record<string, readonly [string, string, string]> = {
  cafe: ['rgba(30,58,138,0.15)', 'rgba(15,23,42,0.55)', 'rgba(15,23,42,0.92)'],
  restaurant: ['rgba(22,78,54,0.12)', 'rgba(15,23,42,0.5)', 'rgba(12,46,35,0.9)'],
  bar: ['rgba(127,29,29,0.15)', 'rgba(15,23,42,0.5)', 'rgba(76,17,48,0.9)'],
  bakery: ['rgba(146,64,14,0.12)', 'rgba(15,23,42,0.48)', 'rgba(69,26,3,0.88)'],
}

const DEFAULT_OVERLAY = ['rgba(15,23,42,0.08)', 'rgba(15,23,42,0.52)', 'rgba(15,23,42,0.9)'] as const

function overlayColors(category: string | null | undefined): readonly [string, string, string] {
  const key = category?.toLowerCase() ?? 'cafe'
  return OVERLAY_BY_CATEGORY[key] ?? DEFAULT_OVERLAY
}

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
  const gradient = overlayColors(item.venue?.category)

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
            backgroundColor: '#1e293b',
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
            colors={[...gradient]}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />

          <View style={{ flex: 1, padding: 18, justifyContent: 'space-between' }}>
            <View>
              <Text
                style={withAppFont({
                  fontSize: 26,
                  fontWeight: '800',
                  color: '#FFFFFF',
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
                  <Text style={{ fontSize: 22, fontWeight: '800' }}>{stamps}</Text>
                  {` / ${max} stamps`}
                </Text>
                <WalletStampDashes filled={stamps} total={max} />
              </View>
              <View style={{ alignItems: 'flex-end', minWidth: 88 }}>
                <Text
                  style={withAppFont({
                    fontSize: 40,
                    fontWeight: '800',
                    color: '#FFFFFF',
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
