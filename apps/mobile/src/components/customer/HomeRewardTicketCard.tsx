import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { type ReactNode, useState } from 'react'
import { Image, Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Line } from 'react-native-svg'

import { visitsToRewardCopy } from '../../lib/progressCopy'
import { rewardImageUrl, venueLogoUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { colors, shadows } from '../../theme'
import type { VenueRef } from '../../types/loyalty'

const ticket = {
  surface: '#FFFBF5',
  border: '#EDE4D6',
  badgeReadyBg: '#FBD89A',
  badgeReadyText: '#7C4A0A',
  badgeNextBg: '#E8EDFF',
  badgeNextText: '#4338CA',
  illustrationBg: '#FEF3C7',
  illustrationIcon: '#C68B1F',
  divider: '#BCA98E',
  radius: 22,
} as const

const panelBorder = {
  borderColor: ticket.border,
  borderWidth: 1,
} as const

export type HomeRewardTicketVariant = 'ready' | 'next'

export interface HomeRewardTicketCardProps {
  variant: HomeRewardTicketVariant
  title: string
  venue?: VenueRef | null
  imageUri?: string | null
  stampsToGo?: number | null
  unlockId?: number
  cardId?: number
  venueId?: number
  width?: number
  style?: StyleProp<ViewStyle>
  /** When false, in-progress tickets are not wrapped in a navigation link */
  linkable?: boolean
}

function TicketPattern({ cardWidth }: { cardWidth: number }) {
  const marks = [
    { top: 16, left: cardWidth * 0.56, size: 18, glyph: '★', opacity: 0.07 },
    { top: 54, left: cardWidth * 0.68, size: 20, glyph: '☕', opacity: 0.085 },
    { top: 92, left: cardWidth * 0.52, size: 15, glyph: '🎁', opacity: 0.06 },
  ] as const

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 80 }}>
      {marks.map((mark, index) => (
        <Text
          key={index}
          style={{
            position: 'absolute',
            top: mark.top,
            left: mark.left,
            fontSize: mark.size,
            opacity: mark.opacity,
            color: ticket.badgeReadyText,
          }}
        >
          {mark.glyph}
        </Text>
      ))}
    </View>
  )
}

function TicketPerforation({ inset = 0 }: { inset?: number }) {
  const [lineWidth, setLineWidth] = useState(0)

  return (
    <View style={{ flex: 1, height: 18, justifyContent: 'center', marginHorizontal: inset }}>
      <View
        style={{ height: 1, overflow: 'hidden' }}
        onLayout={(event) => {
          const width = Math.round(event.nativeEvent.layout.width)
          setLineWidth((current) => (current === width ? current : width))
        }}
      >
        {lineWidth > 0 ? (
          <Svg width={lineWidth} height={1}>
            <Line
              x1="0"
              y1="0"
              x2={lineWidth}
              y2="0"
              stroke={ticket.divider}
              strokeWidth={2}
              strokeDasharray="6 7"
              strokeLinecap="round"
            />
          </Svg>
        ) : null}
      </View>
    </View>
  )
}

function RewardIllustration({
  variant,
  imageUri,
  venue,
}: {
  variant: HomeRewardTicketVariant
  imageUri?: string | null
  venue?: VenueRef | null
}) {
  const logo = venueLogoUrl(venue ?? undefined)
  const showPhoto = variant === 'next' && (imageUri || logo)

  return (
    <View
      style={{
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: ticket.illustrationBg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showPhoto && imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: 88, height: 88 }} resizeMode="cover" />
      ) : showPhoto && logo ? (
        <Image source={{ uri: logo }} style={{ width: 88, height: 88 }} resizeMode="cover" />
      ) : (
        <Ionicons name="cafe-outline" size={42} color={ticket.illustrationIcon} />
      )}
    </View>
  )
}

function RewardTicketShell({
  width,
  style,
  isReady,
  top,
  footer,
}: {
  width?: number
  style?: StyleProp<ViewStyle>
  isReady: boolean
  top: ReactNode
  footer: ReactNode
}) {
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const shellWidth = width ?? measuredWidth

  return (
    <View
      onLayout={(event) => {
        if (width != null) return
        const nextWidth = Math.round(event.nativeEvent.layout.width)
        setMeasuredWidth((current) => (current === nextWidth ? current : nextWidth))
      }}
      style={[
        {
          width,
          overflow: 'visible',
          ...(Platform.OS === 'ios' ? shadows.md : { elevation: 4 }),
        },
        style,
      ]}
    >
      <View
        style={{
          backgroundColor: ticket.surface,
          borderTopLeftRadius: ticket.radius,
          borderTopRightRadius: ticket.radius,
          ...panelBorder,
          borderBottomWidth: 0,
          overflow: 'hidden',
        }}
      >
        {isReady && shellWidth > 0 ? <TicketPattern cardWidth={shellWidth} /> : null}
        {top}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: 22,
          backgroundColor: ticket.surface,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: ticket.border,
          marginTop: -1,
          marginBottom: -1,
          zIndex: 2,
        }}
      >
        <TicketPerforation inset={22} />
      </View>

      <View
        style={{
          backgroundColor: ticket.surface,
          borderBottomLeftRadius: ticket.radius,
          borderBottomRightRadius: ticket.radius,
          ...panelBorder,
          borderTopWidth: 0,
        }}
      >
        {footer}
      </View>
    </View>
  )
}

export default function HomeRewardTicketCard({
  variant,
  title,
  venue,
  imageUri,
  stampsToGo,
  unlockId,
  cardId,
  venueId,
  width,
  style,
  linkable = true,
}: HomeRewardTicketCardProps) {
  const isReady = variant === 'ready'
  const venueName = venue?.name ?? 'Venue'
  const resolvedImage = imageUri ?? rewardImageUrl({ title, image: null, image_thumb: null })

  const top = (
    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: isReady ? ticket.badgeReadyBg : ticket.badgeNextBg,
            }}
          >
            <Ionicons name="gift" size={13} color={isReady ? '#FFFFFF' : '#6366F1'} />
            <Text
              style={withAppFont({
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 0.85,
                color: isReady ? ticket.badgeReadyText : ticket.badgeNextText,
              })}
            >
              {isReady ? 'READY TO CLAIM' : 'NEXT REWARD'}
            </Text>
          </View>

          <Text
            style={withAppFont({
              marginTop: 14,
              fontSize: 27,
              fontWeight: '800',
              color: colors.ink,
              letterSpacing: -0.55,
              lineHeight: 33,
            })}
            numberOfLines={2}
          >
            {title}
          </Text>

          <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="location-outline" size={15} color={colors.inkMuted} />
            <Text style={withAppFont({ fontSize: 14, fontWeight: '600', color: colors.inkMuted })} numberOfLines={1}>
              {venueName}
            </Text>
          </View>

          <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isReady ? (
              <>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success }} />
                <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.success })}>Ready now</Text>
              </>
            ) : (
              <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.inkMuted })}>
                {stampsToGo != null ? visitsToRewardCopy(stampsToGo, title) : 'Keep collecting'}
              </Text>
            )}
          </View>
        </View>

        <RewardIllustration variant={variant} imageUri={resolvedImage} venue={venue} />
      </View>
    </View>
  )

  const footer = (
    <View style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.ink,
          borderRadius: 16,
          paddingVertical: 15,
          paddingLeft: 18,
          paddingRight: 16,
          gap: 10,
        }}
      >
        <Ionicons name={isReady ? 'qr-code-outline' : 'stats-chart-outline'} size={22} color={colors.primaryText} />
        <Text
          style={withAppFont({
            flex: 1,
            fontSize: 16,
            fontWeight: '700',
            color: colors.primaryText,
          })}
        >
          {isReady ? 'Show QR to claim' : 'View progress'}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={colors.primaryText} />
      </View>
    </View>
  )

  const body = (
    <RewardTicketShell width={width} style={style} isReady={isReady} top={top} footer={footer} />
  )

  const pressedStyle = ({ pressed }: { pressed: boolean }) => [{ opacity: pressed ? 0.97 : 1 }]

  if (linkable && isReady && unlockId) {
    return (
      <Link href={{ pathname: '/claim/[unlockId]', params: { unlockId: String(unlockId) } }} asChild>
        <Pressable style={pressedStyle}>{body}</Pressable>
      </Link>
    )
  }

  if (linkable && !isReady && cardId && venueId) {
    return (
      <Link
        href={{
          pathname: '/card/[cardId]',
          params: { cardId: String(cardId), venueId: String(venueId) },
        }}
        asChild
      >
        <Pressable style={pressedStyle}>{body}</Pressable>
      </Link>
    )
  }

  return body
}
