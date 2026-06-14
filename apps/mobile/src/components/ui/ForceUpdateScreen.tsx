import * as Linking from 'expo-linking'
import { Text, View } from 'react-native'

import StateCard from './StateCard'
import ScreenGradientLayout from './ScreenGradientLayout'
import { withAppFont } from '../../lib/typography'
import { colors, space } from '../../theme'

interface ForceUpdateScreenProps {
  currentVersion: string
  requiredVersion: string | null
  updateUrl: string
}

export default function ForceUpdateScreen({
  currentVersion,
  requiredVersion,
  updateUrl,
}: ForceUpdateScreenProps) {
  return (
    <ScreenGradientLayout scrollable={false} tabBarInset={false}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: space.screenX }}>
        <StateCard
          icon="cloud-download-outline"
          title="Update Flotory"
          message={
            requiredVersion
              ? `This version (${currentVersion}) is no longer supported. Install ${requiredVersion} or newer to keep collecting stamps.`
              : 'A newer version of Flotory is required to continue.'
          }
          primaryAction={{
            label: 'Get the update',
            onPress: () => {
              void Linking.openURL(updateUrl)
            },
          }}
        />
        <Text
          style={withAppFont({
            marginTop: 16,
            textAlign: 'center',
            fontSize: 12,
            lineHeight: 18,
            color: colors.inkMuted,
          })}
        >
          After updating, reopen Flotory from your home screen.
        </Text>
      </View>
    </ScreenGradientLayout>
  )
}
