import * as Linking from 'expo-linking'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()

  return (
    <ScreenGradientLayout scrollable={false} tabBarInset={false}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: space.screenX }}>
        <StateCard
          icon="cloud-download-outline"
          title={t('forceUpdate.title')}
          message={
            requiredVersion
              ? t('forceUpdate.messageWithVersion', { current: currentVersion, required: requiredVersion })
              : t('forceUpdate.message')
          }
          primaryAction={{
            label: t('forceUpdate.action'),
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
          {t('forceUpdate.footer')}
        </Text>
      </View>
    </ScreenGradientLayout>
  )
}
