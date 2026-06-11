import React, { createContext, useContext, useMemo } from 'react'

import { useNfcStampScan } from '../hooks/useNfcStampScan'

interface NfcStampScanContextValue {
  startScan: () => Promise<void>
  scanning: boolean
}

const NfcStampScanContext = createContext<NfcStampScanContextValue | undefined>(undefined)

export function NfcStampScanProvider({ children }: { children: React.ReactNode }) {
  const { startScan, scanning } = useNfcStampScan()

  const value = useMemo<NfcStampScanContextValue>(
    () => ({ startScan, scanning }),
    [startScan, scanning],
  )

  return <NfcStampScanContext.Provider value={value}>{children}</NfcStampScanContext.Provider>
}

export function useNfcStampScanAction() {
  const context = useContext(NfcStampScanContext)
  if (!context) {
    throw new Error('useNfcStampScanAction must be used inside NfcStampScanProvider')
  }

  return context
}
