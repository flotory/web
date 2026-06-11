const { withInfoPlist, withEntitlementsPlist, AndroidConfig, withAndroidManifest } = require('expo/config-plugins')

const NFC_USAGE =
  'Flotory reads NFC stamp stands at cafes and restaurants to add loyalty stamps to your wallet.'

/** Expo config plugin: Core NFC (iOS) + NFC permission (Android) for react-native-nfc-manager */
function withNfc(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.NFCReaderUsageDescription =
      mod.modResults.NFCReaderUsageDescription ?? NFC_USAGE
    return mod
  })

  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.nfc.readersession.formats'] = ['TAG']
    return mod
  })

  config = withAndroidManifest(config, (mod) => {
    mod.modResults.manifest = AndroidConfig.Manifest.ensureToolsAvailable(mod.modResults.manifest)
    AndroidConfig.Manifest.addUsesPermission(mod.modResults.manifest, 'android.permission.NFC')
    return mod
  })

  return config
}

module.exports = withNfc
