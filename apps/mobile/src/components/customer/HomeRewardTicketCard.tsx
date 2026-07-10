import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { type ReactNode, useState } from 'react'
import { Image, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import Svg, { Line } from 'react-native-svg'

import { rewardImageUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { colors, radius, rewardReady, shadows } from '../../theme'
import type { VenueRef } from '../../types/loyalty'

const TICKET_RADIUS = 22
const READY_BORDER = 'rgba(215, 163, 93, 0.22)'
const READY_ACCENT_BORDER = 'rgba(215, 163, 93, 0.38)'

function panelBorder(isReady = false) {
  if (isReady) {
    return {
      borderColor: READY_BORDER,
      borderWidth: StyleSheet.hairlineWidth,
    } as const
  }

  return {
    borderColor: 'rgba(5, 13, 30, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
  } as const
}

function readyVoucherSurface() {
  return {
    backgroundColor: '#FFFCF6',
  } as const
}

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
  /** When false, cards are not wrapped in navigation links */
  linkable?: boolean
  /** In-card stamp progress (cafe card page) */
  stampProgress?: { collected: number; target: number } | null
}

function TicketStampProgress({
  collected,
  target,
  completeLabel,
}: {
  collected: number
  target: number
  completeLabel: string
}) {
  const { t } = useTranslation()
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
              backgroundColor: index < filled ? colors.progressFilled : colors.progressTrack,
            }}
          />
        ))}
      </View>
      <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={withAppFont({ fontSize: 13, fontWeight: '700', color: colors.inkMuted })}>
          {t('home.progressCount', { current: filled, target })}
        </Text>
        <Text style={withAppFont({ fontSize: 13, fontWeight: '800', color: toGo <= 0 ? colors.accent : colors.ink })}>
          {toGo <= 0 ? completeLabel : t('home.stampToGoInline', { count: toGo })}
        </Text>
      </View>
    </View>
  )
}

function TicketCompactAction({
  label,
  icon,
  style,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      style={[{
        marginTop: 14,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 0,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: 'transparent',
      }, style]}
    >
      <Ionicons name={icon} size={15} color={colors.inkMuted} />
      <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.ink })}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color={colors.inkSoft} />
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
            color: colors.ink,
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
    <View style={{ flex: 1, height: 22, justifyContent: 'center', marginHorizontal: inset }}>
      <View
        style={{ height: 2, overflow: 'hidden' }}
        onLayout={(event) => {
          const width = Math.round(event.nativeEvent.layout.width)
          setLineWidth((current) => (current === width ? current : width))
        }}
      >
        {lineWidth > 0 ? (
          <Svg width={lineWidth} height={2}>
            <Line
              x1="0"
              y1="1"
              x2={lineWidth}
              y2="1"
              stroke={colors.inkSoft}
              strokeWidth={1.5}
              strokeDasharray="5 6"
              strokeLinecap="round"
              strokeOpacity={0.55}
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
}: {
  variant: HomeRewardTicketVariant
  imageUri?: string | null
}) {
  const resolvedImage =
    imageUri ??
    rewardImageUrl({
      title: null,
      image: null,
      image_thumb: null,
    })

  return (
    <View
      style={{
        width: 88,
        height: 88,
        borderRadius: 20,
        backgroundColor: variant === 'ready' ? rewardReady.backgroundColor : 'rgba(243, 224, 185, 0.28)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: variant === 'ready' ? READY_BORDER : 'rgba(5, 13, 30, 0.09)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {resolvedImage ? (
        <Image source={{ uri: resolvedImage }} style={{ width: 88, height: 88 }} resizeMode="cover" />
      ) : (
        <Ionicons name={variant === 'ready' ? 'gift-outline' : 'cafe-outline'} size={42} color={colors.accent} />
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
  showPerforation = true,
}: {
  width?: number
  style?: StyleProp<ViewStyle>
  isReady: boolean
  top: ReactNode
  footer: ReactNode | null
  showPerforation?: boolean
}) {
  const [measuredWidth, setMeasuredWidth] = useState(0)
  const shellWidth = width ?? measuredWidth
  const splitTicket = showPerforation && footer != null

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

  const readyAccent = isReady ? { borderLeftWidth: 3, borderLeftColor: READY_ACCENT_BORDER } : {}
  const surfaceStyle = isReady ? readyVoucherSurface() : { backgroundColor: colors.surface }

  if (!splitTicket) {
    return shellFrame(
      <View
        style={{
          ...surfaceStyle,
          borderRadius: TICKET_RADIUS,
          ...panelBorder(isReady),
          ...readyAccent,
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
          ...surfaceStyle,
          borderTopLeftRadius: TICKET_RADIUS,
          borderTopRightRadius: TICKET_RADIUS,
          ...panelBorder(isReady),
          ...readyAccent,
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
          backgroundColor: isReady ? '#FFFCF6' : colors.surface,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: isReady ? READY_BORDER : colors.border,
          marginTop: -1,
          marginBottom: -1,
          zIndex: 2,
          ...(isReady ? { borderLeftWidth: 3, borderLeftColor: READY_ACCENT_BORDER } : {}),
        }}
      >
        <TicketPerforation inset={22} />
      </View>

      <View
        style={{
          ...surfaceStyle,
          borderBottomLeftRadius: TICKET_RADIUS,
          borderBottomRightRadius: TICKET_RADIUS,
          ...panelBorder(isReady),
          borderTopWidth: 0,
          ...(isReady ? { borderLeftWidth: 3, borderLeftColor: READY_ACCENT_BORDER } : {}),
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
  stampProgress = null,
}: HomeRewardTicketCardProps) {
  const { t } = useTranslation()
  const isReady = variant === 'ready'
  const venueName = venue?.name ?? t('common.venue')
  const resolvedImage = imageUri ?? rewardImageUrl({ title, image: null, image_thumb: null })
  const showNextFooter = false

  const top = (
    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: isReady ? 20 : 16 }}>
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
              borderRadius: radius.button,
              backgroundColor: isReady ? rewardReady.backgroundColor : colors.bg,
              ...(isReady
                ? { borderWidth: StyleSheet.hairlineWidth, borderColor: READY_BORDER }
                : {}),
            }}
          >
            <Ionicons
              name={isReady ? 'gift-outline' : 'cafe-outline'}
              size={13}
              color={isReady ? rewardReady.iconColor : colors.inkMuted}
            />
            <Text
              style={withAppFont({
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 0.85,
                color: isReady ? colors.accentActive : colors.ink,
              })}
            >
              {isReady ? t('redeem.readyToRedeem') : t('home.nextRewardBadge')}
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
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />
                  <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.accent })}>{t('home.readyNow')}</Text>
                </>
              ) : (
                <Text style={withAppFont({ fontSize: 14, fontWeight: '700', color: colors.inkMuted })}>
                  {stampsToGo != null ? t('home.stampsToReward', { count: stampsToGo, reward: title }) : t('home.keepCollecting')}
                </Text>
              )}
            </View>
          ) : null}
          {stampProgress ? (
            <TicketStampProgress
              collected={stampProgress.collected}
              target={stampProgress.target}
              completeLabel={isReady ? t('home.unlocked') : t('home.readyToClaim')}
            />
          ) : null}
          {isReady && linkable && unlockId ? (
            <TicketCompactAction label={t('home.redeemReward')} icon="gift-outline" />
          ) : null}
        </View>

        <RewardIllustration variant={variant} imageUri={resolvedImage} />
      </View>
    </View>
  )

  const footer = null

  const body = (
    <RewardTicketShell
      width={width}
      style={style}
      isReady={isReady}
      top={top}
      footer={footer}
      showPerforation={showNextFooter}
    />
  )

  const pressedStyle = ({ pressed }: { pressed: boolean }) => [{ opacity: pressed ? 0.97 : 1 }]

  if (linkable && isReady && unlockId) {
    return (
      <Link
        href={{
          pathname: '/redeem/[unlockId]',
          params: { unlockId: String(unlockId) },
        }}
        asChild
      >
        <Pressable testID="reward-redeem-link" style={pressedStyle}>
          {body}
        </Pressable>
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
