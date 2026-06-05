import { Ionicons } from '@expo/vector-icons'
import { Link, useRouter } from 'expo-router'
import { type ReactNode, useState } from 'react'
import { ActivityIndicator, Image, Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Line } from 'react-native-svg'

import { visitsToRewardCopy } from '../../lib/progressCopy'
import { rewardImageUrl, venueLogoUrl } from '../../lib/media'
import { openClaimQrForUnlock } from '../../lib/openClaimQr'
import { useAuth } from '../../providers/AuthProvider'
import { withAppFont } from '../../lib/typography'
import { colors, shadows } from '../../theme'
import type { VenueRef } from '../../types/loyalty'

const ticket = {
  surface: '#FFFBF5',
  border: '#EDE4D6',
  badgeReadyBg: '#FBD89A',
  badgeReadyText: '#7C4A0A',
  badgeNextBg: '#F0E6D8',
  badgeNextText: '#5C4033',
  illustrationBg: '#F3EBDD',
  illustrationIcon: '#8B6914',
  divider: '#BCA98E',
  progressFilled: '#5C4033',
  progressTrack: '#E5DDD0',
  readyAccent: '#8B6914',
  actionBg: '#FAF6F0',
  actionBorder: '#D9C9B4',
  actionText: '#4A3428',
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
  /** Called when a ready reward is no longer claimable (stale list) */
  onClaimUnavailable?: () => void
  /** In-card visit progress (cafe card page) */
  stampProgress?: { collected: number; target: number } | null
}

function TicketStampProgress({ collected, target }: { collected: number; target: number }) {
  const slots = Math.min(Math.max(target, 1), 10)
  const filled = Math.min(Math.max(collected, 0), slots)
  const toGo = Math.max(target - collected, 0)

  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: slots }).map((_, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 7,
              borderRadius: 4,
              backgroundColor: index < filled ? ticket.progressFilled : ticket.progressTrack,
            }}
          />
        ))}
      </View>
      <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.inkMuted })}>
          {filled} of {target} visits
        </Text>
        <Text style={withAppFont({ fontSize: 13, fontWeight: '800', color: toGo <= 0 ? ticket.readyAccent : ticket.badgeNextText })}>
          {toGo <= 0 ? 'Ready to claim' : toGo === 1 ? '1 visit to go' : `${toGo} visits to go`}
        </Text>
      </View>
    </View>
  )
}

function TicketCompactAction({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View
      style={{
        marginTop: 14,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: ticket.actionBorder,
        backgroundColor: ticket.actionBg,
      }}
    >
      <Ionicons name={icon} size={15} color={ticket.actionText} />
      <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: ticket.actionText })}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color={ticket.actionText} />
    </View>
  )
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
        <Ionicons name={variant === 'ready' ? 'qr-code-outline' : 'cafe-outline'} size={42} color={ticket.illustrationIcon} />
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
  footer: ReactNode | null
}) {
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const shellWidth = width ?? measuredWidth

  const shellFrame = (content: ReactNode) => (
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
      {content}
    </View>
  )

  if (footer == null) {
    return shellFrame(
      <View
        style={{
          backgroundColor: ticket.surface,
          borderRadius: ticket.radius,
          ...panelBorder,
          overflow: 'hidden',
        }}
      >
        {isReady && shellWidth > 0 ? <TicketPattern cardWidth={shellWidth} /> : null}
        {top}
      </View>,
    )
  }

  return shellFrame(
    <>
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
    </>,
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
  onClaimUnavailable,
  stampProgress = null,
}: HomeRewardTicketCardProps) {
  const router = useRouter()
  const { token } = useAuth()
  const [openingClaim, setOpeningClaim] = useState(false)
  const isReady = variant === 'ready'
  const venueName = venue?.name ?? 'Venue'
  const resolvedImage = imageUri ?? rewardImageUrl({ title, image: null, image_thumb: null })
  const showInlineAction = isReady || (linkable && cardId != null && venueId != null)

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
            <Ionicons
              name={isReady ? 'qr-code-outline' : 'cafe-outline'}
              size={13}
              color={isReady ? ticket.badgeReadyText : ticket.badgeNextText}
            />
            <Text
              style={withAppFont({
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 0.85,
                color: isReady ? ticket.badgeReadyText : ticket.badgeNextText,
              })}
            >
              {isReady ? 'SHOW AT COUNTER' : 'NEXT REWARD'}
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

          {!stampProgress ? (
            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isReady ? (
                <>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ticket.readyAccent }} />
                  <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: ticket.readyAccent })}>Ready now</Text>
                </>
              ) : (
                <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.inkMuted })}>
                  {stampsToGo != null ? visitsToRewardCopy(stampsToGo, title) : 'Keep collecting'}
                </Text>
              )}
            </View>
          ) : null}
          {stampProgress ? (
            <TicketStampProgress collected={stampProgress.collected} target={stampProgress.target} />
          ) : null}
          {showInlineAction ? (
            <TicketCompactAction
              label={isReady ? 'Open claim QR' : 'View card'}
              icon={isReady ? 'qr-code-outline' : 'card-outline'}
            />
          ) : null}
        </View>

        <RewardIllustration variant={variant} imageUri={resolvedImage} venue={venue} />
      </View>
    </View>
  )

  const body = (
    <RewardTicketShell width={width} style={style} isReady={isReady} top={top} footer={null} />
  )

  const pressedStyle = ({ pressed }: { pressed: boolean }) => [{ opacity: pressed ? 0.97 : 1 }]

  if (linkable && isReady && unlockId) {
    return (
      <Pressable
        style={pressedStyle}
        disabled={openingClaim}
        onPress={() => {
          if (!token || openingClaim) return
          setOpeningClaim(true)
          void openClaimQrForUnlock(router, token, unlockId, { onStale: onClaimUnavailable }).finally(() => {
            setOpeningClaim(false)
          })
        }}
      >
        <View>
          {body}
          {openingClaim ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.72)',
                borderRadius: ticket.radius,
              }}
            >
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}
        </View>
      </Pressable>
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
