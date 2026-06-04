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
import { SafeAreaProvider } from 'react-native-safe-area-context'

import FlotoryBootScreen from '../src/components/brand/FlotoryBootScreen'
import { AuthProvider, useAuth } from '../src/providers/AuthProvider'
import { RealtimeProvider } from '../src/providers/RealtimeProvider'
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
    return <FlotoryBootScreen />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RealtimeProvider>
          <RootNavigator />
        </RealtimeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}

