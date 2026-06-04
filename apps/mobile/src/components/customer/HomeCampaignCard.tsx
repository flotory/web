import { Ionicons } from '@expo/vector-icons'
import { Image, Platform, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

import { campaignEndsLabel } from '../../lib/campaignEndsLabel'
import { venueCoverUrl } from '../../lib/media'
import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows } from '../../theme'
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
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: colors.accentBorder,
        backgroundColor: dark ? colors.ink : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...(dark && Platform.OS === 'ios' ? shadows.sm : {}),
      }}
    >
      <Text style={withAppFont({ fontSize: 14, fontWeight: '900', color: dark ? '#FCD34D' : colors.accent, lineHeight: 16 })}>
        {multiplier}×
      </Text>
      <Text
        style={withAppFont({
          fontSize: 7,
          fontWeight: '800',
          letterSpacing: 0.8,
          color: dark ? 'rgba(252,211,77,0.88)' : colors.inkMuted,
        })}
      >
        STAMPS
      </Text>
    </View>
  )

  return ring
}

function EndsRow({ label, tone }: { label: string; tone: 'gold' | 'violet' }) {
  const textColor = tone === 'gold' ? '#FDE68A' : '#6D28D9'
  const iconColor = tone === 'gold' ? '#FCD34D' : '#8B5CF6'

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
  const endsLabel = campaignEndsLabel(campaign.days_left)
  const cover = venueCoverUrl(venue ?? { name: campaign.venue_name })
  const title = campaign.name?.trim() || campaign.headline
  const description = campaign.message

  if (featured) {
    return (
      <View
        style={{
          width,
          minHeight: 204,
          borderRadius: radius.card,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          ...(Platform.OS === 'ios' ? shadows.md : { elevation: 4 }),
        }}
      >
        <LinearGradient
          colors={['#1E3A5F', '#0F172A', '#0F172A']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <View
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: 'rgba(255,255,255,0.04)',
              top: -28,
              right: 32,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(255,255,255,0.03)',
              bottom: 24,
              left: -16,
            }}
          />

          <View style={{ flex: 1, flexDirection: 'row', padding: 18, gap: 12 }}>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
              <View>
                <CampaignBadge
                  label="Featured"
                  icon="star"
                  backgroundColor="#FEF3C7"
                  textColor="#92400E"
                  borderColor="#FDE68A"
                />
                <Text
                  style={withAppFont({
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: '600',
                    color: 'rgba(248,250,252,0.65)',
                    letterSpacing: 0.3,
                  })}
                  numberOfLines={1}
                >
                  {campaign.venue_name}
                </Text>
                <Text
                  style={withAppFont({
                    marginTop: 5,
                    fontSize: 20,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    lineHeight: 25,
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
                    color: 'rgba(248,250,252,0.75)',
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
                      borderColor: 'rgba(255,255,255,0.14)',
                    }}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 16,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                    }}
                  />
                )}
                <View style={{ position: 'absolute', top: -8, right: -12 }}>
                  <MultiplierStampBadge multiplier={campaign.multiplier} dark />
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>
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
        label={campaign.applies_now ? 'Active' : 'New'}
        icon={campaign.applies_now ? 'flash' : 'sparkles'}
        backgroundColor={campaign.applies_now ? colors.successBg : colors.lavender}
        textColor={campaign.applies_now ? colors.successText : '#5B21B6'}
        borderColor={campaign.applies_now ? colors.successBorder : colors.lavenderBorder}
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
      {endsLabel ? <EndsRow label={endsLabel} tone="violet" /> : null}
    </View>
  )
}
