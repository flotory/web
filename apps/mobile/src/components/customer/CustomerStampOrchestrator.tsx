import { Ionicons } from '@expo/vector-icons'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useCustomerStampSync } from '../../hooks/useCustomerStampSync'
import { colors } from '../../theme'
import { withAppFont } from '../../lib/typography'

/** Navigates to the stamped card; toast + slot animation run only on the card screen. */
export default function CustomerStampOrchestrator() {
  const { status } = useCustomerStampSync()
  const insets = useSafeAreaInsets()

  if (status === 'ok') {
    return null
  }

  const offline = status === 'offline'

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 10,
        left: 18,
        right: 18,
        zIndex: 50,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 9,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: offline ? '#FED7AA' : colors.lavenderBorder,
          backgroundColor: offline ? '#FFF7ED' : colors.lavender,
        }}
      >
        <Ionicons
          name={offline ? 'cloud-offline-outline' : 'sync-outline'}
          size={16}
          color={offline ? '#C2410C' : colors.primary}
        />
        <Text
          style={withAppFont({
            fontSize: 12,
            fontWeight: '800',
            color: offline ? '#C2410C' : colors.primary,
          })}
        >
          {offline ? 'Offline — updates paused' : 'Sync delayed — retrying'}
        </Text>
      </View>
    </View>
  )
}
