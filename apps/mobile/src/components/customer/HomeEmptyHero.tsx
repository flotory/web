import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, shadows } from '../../theme'

interface HomeEmptyHeroProps {
  onFindVenue: () => void
  onStamp?: () => void
}

export default function HomeEmptyHero({ onFindVenue, onStamp }: HomeEmptyHeroProps) {
  return (
    <View
      style={{
        borderRadius: radius.card,
        padding: 22,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.md,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="cafe-outline" size={28} color={colors.accentActive} />
      </View>

      <Text
        style={withAppFont({
          marginTop: 16,
          fontSize: 24,
          fontWeight: '800',
          color: colors.ink,
          letterSpacing: -0.4,
          lineHeight: 30,
        })}
      >
        Start your first loyalty card
      </Text>
      <Text style={withAppFont({ marginTop: 8, fontSize: 15, lineHeight: 22, color: colors.inkMuted })}>
        Find a cafe nearby, join their program, and collect stamps with a tap at the NFC stand.
      </Text>

      <View style={{ marginTop: 18, gap: 10 }}>
        <Pressable
          onPress={onFindVenue}
          style={({ pressed }) => ({
            paddingVertical: 14,
            borderRadius: radius.button,
            backgroundColor: colors.primary,
            alignItems: 'center',
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <Text style={withAppFont({ fontSize: 15, fontWeight: '800', color: colors.primaryText })}>Find a venue</Text>
        </Pressable>
        {onStamp ? (
          <Pressable
            onPress={onStamp}
            style={({ pressed }) => ({
              paddingVertical: 14,
              borderRadius: radius.button,
              borderWidth: 1,
              borderColor: colors.accentBorder,
              backgroundColor: colors.accentSoft,
              alignItems: 'center',
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={withAppFont({ fontSize: 15, fontWeight: '800', color: colors.ink })}>Collect a stamp</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
