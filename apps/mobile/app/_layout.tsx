import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import BootSplashScreen, { BOOT_SPLASH_BACKGROUND } from '../src/components/ui/BootSplashScreen'
import { AuthProvider, useAuth } from '../src/providers/AuthProvider'
import { RealtimeProvider } from '../src/providers/RealtimeProvider'
import { ThemeProvider } from '../src/providers/ThemeProvider'
import { applyDefaultAppTypography } from '../src/setupTypography'

SplashScreen.preventAutoHideAsync().catch(() => undefined)
applyDefaultAppTypography()

function RootNavigator() {
  const { booting } = useAuth()
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  })

  useEffect(() => {
    if (!booting && fontsLoaded) {
      void SplashScreen.hideAsync()
    }
  }, [booting, fontsLoaded])

  if (booting || !fontsLoaded) {
    return <BootSplashScreen fontsReady={fontsLoaded} />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <View style={styles.appRoot}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <RealtimeProvider>
              <RootNavigator />
            </RealtimeProvider>
          </AuthProvider>
        </ThemeProvider>
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
