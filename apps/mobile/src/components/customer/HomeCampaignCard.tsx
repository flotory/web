import { Ionicons } from '@expo/vector-icons'
import { Image, Platform, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { campaignEndsLabel } from '../../lib/campaignEndsLabel'
import { venueCoverUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { colors, overlays, radius, shadows } from '../../theme'
import type { HomeCampaign, VenueRef } from '../../types/loyalty'

interface HomeCampaignCardProps {
  campaign: HomeCampaign
  width: number
  featured: boolean
  venue?: VenueRef | null
}

function CampaignBadge({
  label,
  icon,
  backgroundColor,
  textColor,
  borderColor,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  backgroundColor: string
  textColor: string
  borderColor?: string
}) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor,
        borderWidth: borderColor ? 1 : 0,
        borderColor: borderColor ?? 'transparent',
      }}
    >
      <Ionicons name={icon} size={11} color={textColor} />
      <Text style={withAppFont({ fontSize: 11, fontWeight: '700', color: textColor, letterSpacing: 0.2 })}>
        {label}
      </Text>
    </View>
  )
}

function MultiplierStampBadge({ multiplier, dark }: { multiplier: number; dark?: boolean }) {
  const ring = (
    <View
      style={{
        width: 54,
        height: 54,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: dark ? overlays.accent45 : colors.accentBorder,
        backgroundColor: dark ? 'rgba(5, 13, 30, 0.92)' : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...(dark && Platform.OS === 'ios' ? shadows.sm : {}),
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: 44,
          height: 44,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: dark ? overlays.accent28 : overlays.accent40,
        }}
      />
      <Text style={withAppFont({ fontSize: 14, fontWeight: '900', color: dark ? colors.accent : colors.accentActive, lineHeight: 16 })}>
        {multiplier}×
      </Text>
      <Text
        style={withAppFont({
          fontSize: 7,
          fontWeight: '800',
          letterSpacing: 0.8,
          color: dark ? colors.accent : colors.inkMuted,
        })}
      >
        STAMPS
      </Text>
    </View>
  )

  return ring
}

function EndsRow({ label, tone }: { label: string; tone: 'gold' | 'muted' }) {
  const textColor = tone === 'gold' ? colors.accent : colors.inkMuted
  const iconColor = tone === 'gold' ? colors.accent : colors.inkSoft

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
      <Ionicons
        name={tone === 'gold' ? 'time-outline' : 'calendar-outline'}
        size={13}
        color={iconColor}
      />
      <Text style={withAppFont({ fontSize: 12, fontWeight: '600', color: textColor })}>{label}</Text>
    </View>
  )
}

export default function HomeCampaignCard({ campaign, width, featured, venue }: HomeCampaignCardProps) {
  const { t } = useTranslation()
  const endsLabel = campaignEndsLabel(campaign.days_left, t)
  const cover = venueCoverUrl(venue ?? { name: campaign.venue_name })
  const title = campaign.name?.trim() || campaign.headline
  const description = campaign.message

  const isActiveNow = campaign.applies_now

  if (isActiveNow) {
    return (
      <View
        style={{
          width,
          minHeight: featured ? 204 : 176,
          borderRadius: radius.card,
          overflow: 'hidden',
          backgroundColor: colors.campaignBg,
          borderWidth: 1,
          borderColor: colors.campaignBorder,
          ...(Platform.OS === 'ios' ? shadows.md : { elevation: 4 }),
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, flexDirection: 'row', padding: 18, gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
              <View>
                <CampaignBadge
                  label={t('home.campaignActive')}
                  icon="flash"
                  backgroundColor="transparent"
                  textColor={colors.accent}
                  borderColor={colors.accent}
                />
                <Text
                  style={withAppFont({
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: '600',
                    color: overlays.white65,
                    letterSpacing: 0.3,
                  })}
                  numberOfLines={1}
                >
                  {campaign.venue_name}
                </Text>
                <Text
                  style={withAppFont({
                    marginTop: 5,
                    fontSize: featured ? 20 : 18,
                    fontWeight: '800',
                    color: colors.primaryText,
                    lineHeight: featured ? 25 : 23,
                    letterSpacing: -0.3,
                  })}
                  numberOfLines={2}
                >
                  {title}
                </Text>
                <Text
                  style={withAppFont({
                    marginTop: 5,
                    fontSize: 13,
                    fontWeight: '500',
                    lineHeight: 19,
                    color: overlays.white75,
                  })}
                  numberOfLines={2}
                >
                  {description}
                </Text>
              </View>
              {endsLabel ? <EndsRow label={endsLabel} tone="gold" /> : null}
            </View>

            <View style={{ width: 104, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'relative' }}>
                {cover ? (
                  <Image
                    source={{ uri: cover }}
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: overlays.white14,
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 16,
                      backgroundColor: overlays.white06,
                      borderWidth: 1,
                      borderColor: overlays.white10,
                    }}
                  />
                )}
                <View style={{ position: 'absolute', top: -8, right: -12 }}>
                  <MultiplierStampBadge multiplier={campaign.multiplier} dark />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View
      style={{
        width,
        minHeight: 176,
        borderRadius: radius.card,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
        ...(Platform.OS === 'ios' ? shadows.md : { elevation: 2 }),
      }}
    >
      <CampaignBadge
        label={t('home.campaignScheduled')}
        icon="time-outline"
        backgroundColor={colors.lavender}
        textColor={colors.ink}
        borderColor={colors.lavenderBorder}
      />
      <Text
        style={withAppFont({
          marginTop: 11,
          fontSize: 12,
          fontWeight: '600',
          color: colors.inkMuted,
          letterSpacing: 0.2,
        })}
        numberOfLines={1}
      >
        {campaign.venue_name}
      </Text>
      <Text
        style={withAppFont({
          marginTop: 5,
          fontSize: 18,
          fontWeight: '800',
          color: colors.ink,
          lineHeight: 23,
          letterSpacing: -0.2,
        })}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text
        style={withAppFont({
          marginTop: 5,
          fontSize: 13,
          fontWeight: '500',
          lineHeight: 19,
          color: colors.inkMuted,
        })}
        numberOfLines={2}
      >
        {description}
      </Text>
      {endsLabel ? <EndsRow label={endsLabel} tone="muted" /> : null}
    </View>
  )
}
