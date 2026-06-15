import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Image, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius } from '../../theme'

const HERO_HEIGHT = 200

interface RedeemPassCardProps {
  title: string
  venueName: string
  imageUri: string | null
  logoUri: string | null
  requiredStamps?: number
  description?: string | null
}

export default function RedeemPassCard({
  title,
  venueName,
  imageUri,
  logoUri,
  requiredStamps,
  description,
}: RedeemPassCardProps) {
  return (
    <LinearGradient
      colors={['#071225', colors.primary, '#0c1a30']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: radius.card,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(215, 163, 93, 0.28)',
      }}
    >
      <View style={{ height: HERO_HEIGHT, backgroundColor: colors.primarySoft }}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(215, 163, 93, 0.12)',
            }}
          >
            <Ionicons name="gift-outline" size={56} color={colors.accent} />
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(5, 13, 30, 0.88)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 }}
        />

        <View
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            paddingHorizontal: 11,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: 'rgba(5, 13, 30, 0.65)',
            borderWidth: 1,
            borderColor: 'rgba(215, 163, 93, 0.35)',
          }}
        >
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />
          <Text style={withAppFont({ fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.accent })}>
            READY TO REDEEM
          </Text>
        </View>
      </View>

      <View style={{ padding: 20, gap: 14 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -36,
            right: 24,
            width: 88,
            height: 88,
            borderRadius: 20,
            backgroundColor: 'rgba(215, 163, 93, 0.08)',
            transform: [{ rotate: '12deg' }],
          }}
        />

        <Text
          style={withAppFont({
            fontSize: 30,
            fontWeight: '800',
            color: colors.primaryText,
            letterSpacing: -0.6,
            lineHeight: 34,
          })}
        >
          {title}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.surface }}
            />
          ) : (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="storefront-outline" size={14} color="rgba(255,255,255,0.8)" />
            </View>
          )}
          <Text style={withAppFont({ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.92)' })} numberOfLines={1}>
            {venueName}
          </Text>
        </View>

        {requiredStamps != null && requiredStamps > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="ticket-outline" size={16} color={colors.accent} />
            <Text style={withAppFont({ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.75)' })}>
              Unlocked after {requiredStamps} {requiredStamps === 1 ? 'stamp' : 'stamps'}
            </Text>
          </View>
        ) : null}

        {description?.trim() ? (
          <Text style={withAppFont({ fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.72)' })}>
            {description.trim()}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  )
}
