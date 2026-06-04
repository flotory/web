import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors, radius, space } from '../../theme'

export default function CardShowQrCta() {
  const router = useRouter()

  return (
    <Pressable
      onPress={() => router.navigate('/(customer)/qr')}
      accessibilityRole="button"
      accessibilityLabel="Show My QR"
      style={({ pressed }) => ({
        marginHorizontal: space.screenX,
        marginTop: space.sectionGap,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: colors.ink,
        borderRadius: radius.card,
        paddingVertical: 16,
        paddingHorizontal: 18,
        opacity: pressed ? 0.94 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="qr-code-outline" size={24} color={colors.primaryText} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={withAppFont({ fontSize: 17, fontWeight: '800', color: colors.primaryText })}>Show My QR</Text>
        <Text style={withAppFont({ marginTop: 2, fontSize: 13, fontWeight: '500', color: 'rgba(248,250,252,0.72)' })}>
          Get stamped at the counter
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primaryText} />
    </Pressable>
  )
}
