import { useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CustomerScreen from '../src/components/ui/CustomerScreen'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import StateCard from '../src/components/ui/StateCard'
import { StickyBackHeader } from '../src/components/ui/StickyBackButton'
import { space, type as typography } from '../src/theme'

export default function NotificationsScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const header = (
    <>
      <StickyBackHeader topInset={insets.top} onPress={() => router.back()} />
      <View style={{ paddingHorizontal: space.screenX }}>
        <ScreenHeader title={t('notifications.title')} subtitle={t('notifications.subtitle')} />
      </View>
    </>
  )

  return (
    <CustomerScreen loading={false} scrollable tabBarInset header={header} headerIncludesSafeArea>
      <View style={{ marginTop: space.headerBottom, paddingHorizontal: space.screenX }}>
        <StateCard
          emoji="🔔"
          title={t('notifications.emptyTitle')}
          message={t('notifications.emptyMessage')}
        />
        <Text style={{ ...typography.caption, marginTop: space.sectionY, textAlign: 'center' }}>
          {t('notifications.comingSoon')}
        </Text>
      </View>
    </CustomerScreen>
  )
}
