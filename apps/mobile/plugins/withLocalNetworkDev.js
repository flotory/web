const { withInfoPlist, withAppDelegate } = require('@expo/config-plugins')

const LOCAL_NETWORK_DESCRIPTION =
  'Flotory connects to the development server on your Mac over the local network while you are testing the app.'
const BONJOUR_MARKER = '// Flotory: trigger iOS local-network permission in debug builds'
const BONJOUR_PROPERTY = 'private var bonjourBrowser: NetServiceBrowser?'
const BONJOUR_METHOD = `
  ${BONJOUR_MARKER}
  private func triggerLocalNetworkPermission() {
    bonjourBrowser = NetServiceBrowser()
    bonjourBrowser?.searchForServices(ofType: "_http._tcp.", inDomain: "local.")
    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
      self?.bonjourBrowser?.stop()
    }
  }`

function withLocalNetworkDev(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSLocalNetworkUsageDescription = LOCAL_NETWORK_DESCRIPTION
    mod.modResults.NSBonjourServices = ['_http._tcp.', '_http._tcp']
    return mod
  })

  return withAppDelegate(config, (mod) => {
    let contents = mod.modResults.contents

    if (!contents.includes(BONJOUR_MARKER)) {
      if (!contents.includes('var reactNativeFactory: RCTReactNativeFactory?')) {
        throw new Error('Unexpected AppDelegate.swift layout for withLocalNetworkDev')
      }

      contents = contents.replace(
        'var reactNativeFactory: RCTReactNativeFactory?',
        `var reactNativeFactory: RCTReactNativeFactory?\n#if DEBUG\n  ${BONJOUR_PROPERTY}\n#endif`,
      )

      contents = contents.replace(
        '  ) -> Bool {\n    let delegate = ReactNativeDelegate()',
        `  ) -> Bool {\n#if DEBUG\n    triggerLocalNetworkPermission()\n#endif\n    let delegate = ReactNativeDelegate()`,
      )

      contents = contents.replace(
        /\n}\n\nclass ReactNativeDelegate:/,
        `\n#if DEBUG${BONJOUR_METHOD}\n#endif\n}\n\nclass ReactNativeDelegate:`,
      )
    }

    mod.modResults.contents = contents
    return mod
  })
}

module.exports = withLocalNetworkDev
