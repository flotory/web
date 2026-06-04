import { useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import CustomerScreen from '../src/components/ui/CustomerScreen'
import ScreenHeader from '../src/components/ui/ScreenHeader'
import StateCard from '../src/components/ui/StateCard'
import { StickyBackHeader } from '../src/components/ui/StickyBackButton'
import { space, type as typography } from '../src/theme'

export default function NotificationsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const header = (
    <>
      <StickyBackHeader topInset={insets.top} onPress={() => router.back()} />
      <View style={{ paddingHorizontal: space.screenX }}>
        <ScreenHeader title="Notifications" subtitle="Updates from your favorite spots." />
      </View>
    </>
  )

  return (
    <CustomerScreen loading={false} scrollable tabBarInset header={header}>
      <View style={{ marginTop: space.headerBottom, paddingHorizontal: space.screenX }}>
        <StateCard
          emoji="🔔"
          title="You're all caught up"
          message="When venues send offers or your rewards are ready, they'll show up here."
        />
        <Text style={{ ...typography.caption, marginTop: space.sectionY, textAlign: 'center' }}>
          Push alerts are coming soon.
        </Text>
      </View>
    </CustomerScreen>
  )
}
