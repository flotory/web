import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import FlotoryBootScreen from '../src/components/brand/FlotoryBootScreen'
import { AuthProvider, useAuth } from '../src/providers/AuthProvider'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

function RootNavigator() {
  const { booting } = useAuth()

  useEffect(() => {
    if (!booting) {
      void SplashScreen.hideAsync()
    }
  }, [booting])

  if (booting) {
    return <FlotoryBootScreen />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}

