import { Image, StyleSheet, Text, View } from 'react-native'

import { withAppFont } from '../../lib/typography'
import { colors } from '../../theme'

/** Matches customer app wallpaper (`screenBackground.warm.base`). */
export const BOOT_SPLASH_BACKGROUND = '#FCFAF6'

/** 128px baseline + 20% for a clearer boot mark. */
export const BOOT_SPLASH_LOGO_SIZE = 154

const bootSplashLogo = require('../../../assets/android-icon-foreground.png')

interface BootSplashScreenProps {
  fontsReady?: boolean
}

export default function BootSplashScreen({ fontsReady = false }: BootSplashScreenProps) {
  const wordmarkStyle = fontsReady
    ? withAppFont({
        marginTop: 16,
        fontSize: 28,
        fontWeight: '800',
        color: colors.ink,
        letterSpacing: -0.6,
      })
    : {
        marginTop: 16,
        fontSize: 28,
        fontWeight: '800' as const,
        color: colors.ink,
        letterSpacing: -0.6,
      }

  return (
    <View style={styles.screen}>
      <Image
        source={bootSplashLogo}
        style={styles.logo}
        accessibilityLabel="Flotory"
        resizeMode="contain"
      />
      <Text style={wordmarkStyle}>Flotory</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOOT_SPLASH_BACKGROUND,
  },
  logo: {
    width: BOOT_SPLASH_LOGO_SIZE,
    height: BOOT_SPLASH_LOGO_SIZE,
  },
})
