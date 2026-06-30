import {
  NotoSansArmenian_400Regular,
  NotoSansArmenian_500Medium,
  NotoSansArmenian_600SemiBold,
  NotoSansArmenian_700Bold,
  NotoSansArmenian_800ExtraBold,
} from '@expo-google-fonts/noto-sans-armenian'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import BootSplashScreen, { BOOT_SPLASH_BACKGROUND } from '../src/components/ui/BootSplashScreen'
import ForceUpdateScreen from '../src/components/ui/ForceUpdateScreen'
import { useAppUpdateGate } from '../src/hooks/useAppUpdateGate'
import { AuthProvider, useAuth } from '../src/providers/AuthProvider'
import { LocaleProvider } from '../src/providers/LocaleProvider'
import { RealtimeProvider } from '../src/providers/RealtimeProvider'
import { ThemeProvider } from '../src/providers/ThemeProvider'
import { applyDefaultAppTypography } from '../src/setupTypography'

SplashScreen.preventAutoHideAsync().catch(() => undefined)
applyDefaultAppTypography()

function RootNavigator() {
  const { booting } = useAuth()
  const updateGate = useAppUpdateGate()
  const [fontsLoaded] = useFonts({
    NotoSansArmenian_400Regular,
    NotoSansArmenian_500Medium,
    NotoSansArmenian_600SemiBold,
    NotoSansArmenian_700Bold,
    NotoSansArmenian_800ExtraBold,
  })

  useEffect(() => {
    if (!booting && fontsLoaded && updateGate.ready) {
      void SplashScreen.hideAsync()
    }
  }, [booting, fontsLoaded, updateGate.ready])

  if (booting || !fontsLoaded || !updateGate.ready) {
    return <BootSplashScreen fontsReady={fontsLoaded} />
  }

  if (updateGate.blocked) {
    return (
      <ForceUpdateScreen
        currentVersion={updateGate.currentVersion}
        requiredVersion={updateGate.requiredVersion}
        updateUrl={updateGate.updateUrl}
      />
    )
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <View style={styles.appRoot}>
      <SafeAreaProvider>
        <LocaleProvider>
          <ThemeProvider>
            <AuthProvider>
              <RealtimeProvider>
                <RootNavigator />
              </RealtimeProvider>
            </AuthProvider>
          </ThemeProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </View>
  )
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: BOOT_SPLASH_BACKGROUND,
  },
})
