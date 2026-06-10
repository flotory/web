import { Redirect } from 'expo-router'

/** Legacy route — NFC scanning lives on the My QR tab. */
export default function NfcScanRedirect() {
  return <Redirect href="/(customer)/qr" />
}
